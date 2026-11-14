import Meeting from "../models/Meeting.js";
import User from "../models/User.js";
import Fine from "../models/Fine.js";
import Settings from "../models/Settings.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";
import { notify, notifyLater } from "../services/notify.js";
import { smsConfig } from "../services/sms.js";

const present = (m) => m.attendance.filter((a) => a.status === "present").length;

export const createMeeting = asyncHandler(async (req, res) => {
  const { title, date, startTime, location, presiding, agenda } = req.body;
  if (!title?.trim() || !date) throw new HttpError(400, "A title and date are required");
  const members = await User.find({ isActive: true }).select("_id");
  const meeting = await Meeting.create({
    title: title.trim(), date, startTime, location, presiding, agenda,
    attendance: members.map((m) => ({ member: m._id })), // everyone starts as "absent" until roll call
  });
  res.status(201).json(meeting);
});

// List plus the numbers for the page header
export const listMeetings = asyncHandler(async (req, res) => {
  const year = new Date().getFullYear();
  const [all, settings] = await Promise.all([Meeting.find().sort("-date"), Settings.get()]);

  const rows = all.map((m) => {
    const total = m.attendance.length;
    const here = present(m);
    return {
      _id: m._id, title: m.title, date: m.date, startTime: m.startTime, location: m.location,
      total, present: here, quorumPct: total ? Math.round((here / total) * 1000) / 10 : 0,
      rollCalled: m.attendance.some((a) => a.status !== "absent"),
      openActions: m.actionItems.filter((a) => a.status !== "done").length,
    };
  });
  const thisYear = rows.filter((r) => new Date(r.date).getFullYear() === year);
  const called = thisYear.filter((r) => r.rollCalled);

  const fines = await Fine.find({
    reason: "missed_meeting", status: "paid",
    paidOn: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
  });

  res.json({
    meetings: rows,
    stats: {
      sittingsThisYear: thisYear.length,
      averageQuorum: called.length ? Math.round((called.reduce((s, r) => s + r.quorumPct, 0) / called.length) * 10) / 10 : null,
      openActions: rows.reduce((s, r) => s + r.openActions, 0),
      absenceFinesCollected: fines.reduce((s, f) => s + f.amount, 0),
      quorumRequired: settings.quorumPercent,
    },
  });
});

export const getMeeting = asyncHandler(async (req, res) => {
  const m = await Meeting.findById(req.params.id).populate("attendance.member", "name memberNo role");
  if (!m) throw new HttpError(404, "Meeting not found");
  res.json(m);
});

// Details, minutes, agenda items and action items (the page sends whole lists)
export const updateMeeting = asyncHandler(async (req, res) => {
  const m = await Meeting.findById(req.params.id);
  if (!m) throw new HttpError(404, "Meeting not found");
  for (const k of ["title", "date", "startTime", "location", "presiding", "agenda", "minutes", "agendaItems", "actionItems"]) {
    if (req.body[k] !== undefined) m.set(k, req.body[k]);
  }
  await m.save();
  res.json(m);
});

// body: { attendance: [{ member, status }] }
export const markAttendance = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) throw new HttpError(404, "Meeting not found");

  for (const a of req.body.attendance || []) {
    const row = meeting.attendance.find((x) => String(x.member) === String(a.member));
    if (row && !row.fined && ["present", "absent", "apology"].includes(a.status)) row.status = a.status;
  }
  await meeting.save();
  res.json(meeting);
});

// Fine everyone marked "absent" (apologies are excused). Safe to click twice.
export const fineAbsentees = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) throw new HttpError(404, "Meeting not found");

  const rule = (await Settings.get()).fines.missedMeeting;
  if (!(rule.value > 0)) throw new HttpError(400, "Set the missed-meeting fine in Settings first");
  if (rule.mode !== "flat") throw new HttpError(400, "The missed-meeting fine must be a flat amount");

  const targets = meeting.attendance.filter((a) => a.status === "absent" && !a.fined);
  await Fine.insertMany(
    targets.map((a) => ({
      member: a.member, reason: "missed_meeting", amount: rule.value,
      note: `Missed meeting: ${meeting.title}`, issuedBy: req.user._id,
    }))
  );
  targets.forEach((a) => (a.fined = true));
  await meeting.save();
  targets.forEach((a) => notifyLater("fineIssued", a.member, { amount: rule.value.toLocaleString("en-KE"), reason: `missed meeting: ${meeting.title}` }));

  res.json({ finesIssued: targets.length, amountEach: rule.value });
});

// Text every active member the meeting details (a button on the Meetings page)
export const remind = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) throw new HttpError(404, "Meeting not found");
  if (!smsConfig().configured) throw new HttpError(400, "SMS is not connected yet");

  const vars = {
    title: meeting.title,
    date: new Date(meeting.date).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" }),
    time: meeting.startTime || "the usual time",
    venue: meeting.location || "the usual venue",
  };
  let sent = 0, failed = 0, skipped = 0;
  for (const a of meeting.attendance) {
    const log = await notify("meetingReminder", a.member, vars, { force: true });
    if (!log) skipped++; else if (log.status === "sent") sent++; else failed++;
  }
  res.json({ sent, failed, skipped });
});
