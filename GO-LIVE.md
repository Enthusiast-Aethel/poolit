# PoolIt: going live with real members

Plans, prices and free-tier limits change. Check each provider's current page before you sign up.

## 1. Install the two new server packages
    cd server
    npm i helmet express-rate-limit

## 2. Database (MongoDB Atlas)
- Create a free cluster on mongodb.com/atlas, pick a region close to your host.
- Database Access: create a user with a strong password. Network Access: allow your host (or 0.0.0.0/0 while testing).
- Copy the connection string into MONGO_URI, ending with /poolit
- **Backups:** the free tier does not give you automatic backups. Either upgrade, or schedule `mongodump`
  weekly, and use the Export buttons on each screen (CSV) as a second copy. Test a restore once.

## 3. Secrets
Copy server/.env.example to server/.env and fill it in:
- NODE_ENV=production
- JWT_SECRET: run  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
- CHAIR_NAME, CHAIR_PHONE, CHAIR_PASSWORD (10+ characters): used once by the seed script
- Never commit .env (it is already in .gitignore)

Then, once:
    cd server
    node src/seed.js
Sign in with your phone number and that password, then delete CHAIR_PASSWORD from .env.

## 4. Deploy as ONE service (Render, Railway or similar)
The server also serves the built React app, so you only need one web address and no CORS setup.
- Build command:  cd client && npm install && npm run build && cd ../server && npm install
- Start command:  cd server && npm start
- Environment variables: the ones from .env (NODE_ENV, MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN)
- HTTPS is automatic on these hosts. Add your own domain in their dashboard if you have one.
- Check  https://YOUR-ADDRESS/api/health  returns {"status":"ok"}

## 5. First-day setup (Settings screen)
1. Chama details, due day, interest rate, borrowing multiplier, guarantors, fines, welfare categories.
2. Contribution types: set the amount for Monthly, Registration, Welfare and Merry-Go-Round.
3. Add every member (Members, Add member). Hand over each temporary password privately.
4. Record each member's registration fee.
5. Titles for officials (Settings, Officials & access).

## 6. Bringing in your existing records
Savings and loans history that already exists must be entered once. Options:
- Small chama: record by hand using the Contributions matrix (click a cell) and New loan.
- Anything bigger: upload Chama_Manager.xlsx and an import script can load members, contributions
  and open loans in one go. Do this before inviting members, so their first login shows correct balances.

## 6b. Text messages (SMS)
PoolIt sends SMS through Africa's Talking. The system works without it: until it is connected, nothing is sent
and the Messages screen lists what would have gone out.

1. Create an account at africastalking.com, open an app, and create an **API key**. Each text is billed by them,
   so add some credit and check their current Kenya rates.
2. Practise first. Use the username **sandbox** with your **sandbox** API key: the whole flow works, but
   nothing reaches a real phone. Their dashboard has a simulator that shows the messages.
3. In server/.env (or your host's environment variables) set SMS_PROVIDER, AT_USERNAME and AT_API_KEY, then restart.
   In PoolIt open **Messages (SMS)** and press **Send a test to my phone** (your own phone number is on your member record).
4. Sender name: by default messages come from the provider's shared sender. A custom name such as KILELE must be
   registered with Africa's Talking first; once approved, put it in AT_SENDER_ID.
5. Delivery reports (optional): set SMS_WEBHOOK_SECRET to a long random text, then in the Africa's Talking
   dashboard set the SMS delivery report address to
       https://YOUR-ADDRESS/api/sms/delivery?token=THE-SAME-SECRET
   Messages then change from Sent to Delivered, or show why they failed.
6. On **Messages (SMS), Automatic messages**, tick **Send automatic messages**, choose which events to text,
   and adjust the wording if you like. Nothing is sent automatically until you tick that box.
7. Reminders: with SMS_REMINDERS=on the server texts members who owe a contribution or loan instalment at
   8:00 am Nairobi time. Hosts that put the app to sleep can miss the 8:00 am run, so also press
   **Send reminders now** when needed. A member is never reminded about the same thing twice in a day.

Good practice: tell members you will text them, and tick "Do not send this member text messages" on their record
if someone asks to opt out. Passwords are never sent by SMS.

## 7. Before you invite members
- The member screens (Home, My savings, My loans, My welfare & governance, Statement) are built.
  Members can see their own records, apply for loans, answer guarantee requests and ask for welfare support.
- Members can NOT pay through the app yet. They pay by M-Pesa as they do today, and you record it
  (the My savings screen shows your Paybill number if you set it in Settings).
- Try it first with 3 or 4 real members: one of them applies for a loan with two guarantors, and you
  approve and disburse it, so everyone has seen the whole flow.
- Kenya's Data Protection Act 2019 covers personal data such as phone and national ID numbers.
  Ask the ODPC (odpc.go.ke) whether your chama needs to register, and tell members how their data is used.
- The printed statement is not signed or stamped by the system. It has blank signature lines for the
  chairperson and treasurer.

## 8. Ongoing
- Change the chairperson password if it was ever shared. Reset a member's password from their profile.
- Take a backup before year-end dividends and before any bulk change.
