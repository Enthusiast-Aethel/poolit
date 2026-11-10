import Meeting from "../models/Meeting.js";
import User from "../models/User.js";
import Fine from "../models/Fine.js";
import Settings from "../models/Settings.js";
import { asyncHandler, HttpError } from "../middleware/errors.js";

export const createMeeting = asyncHandler(async (req, res) => {
  const { title, date, location, agenda } = req.body;
  const members = await User.find({ isActive: true }).select("_id");
  const meeting = await Meeting.create({
    title, date, location, agenda,
    attendance: members.map((m) => ({ member: m._id })), // everyone starts as "absent"
  });
  res.status(201).json(meeting);
});

export const listMeetings = asyncHandler(async (req, res) => {
  res.json(await Meeting.find().select("-attendance").sort("-date"));
});

export const getMeeting = asyncHandler(async (req, res) => {
  const m = await Meeting.findById(req.params.id).populate("attendance.member", "name memberNo");
  if (!m) throw new HttpError(404, "Meeting not found");
  res.json(m);
});

export const updateMeeting = asyncHandler(async (req, res) => {
  const { title, date, location, agenda, minutes } = req.body;
  const m = await Meeting.findByIdAndUpdate(
    req.params.id, { title, date, location, agenda, minutes }, { new: true, runValidators: true }
  );
  if (!m) throw new HttpError(404, "Meeting not found");
  res.json(m);
});

// body: { attendance: [{ member, status }] }
export const markAttendance = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) throw new HttpError(404, "Meeting not found");

  for (const a of req.body.attendance || []) {
    const row = meeting.attendance.find((x) => String(x.member) === String(a.member));
    if (row && !row.fined && ["present", "absent", "apology"].includes(a.status)) {
      row.status = a.status;
    }
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
  if (rule.mode !== "flat") throw new HttpError(400, "Missed-meeting fine must be a flat amount");

  const targets = meeting.attendance.filter((a) => a.status === "absent" && !a.fined);
  await Fine.insertMany(
    targets.map((a) => ({
      member: a.member,
      reason: "missed_meeting",
      amount: rule.value,
      note: `Missed meeting: ${meeting.title}`,
      issuedBy: req.user._id,
    }))
  );
  targets.forEach((a) => (a.fined = true));
  await meeting.save();

  res.json({ finesIssued: targets.length, amountEach: rule.value });
});