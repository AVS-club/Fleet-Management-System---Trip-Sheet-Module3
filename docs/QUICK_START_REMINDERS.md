# 🚀 Quick Start: Email Reminders in 30 Minutes

Get email reminders working fast with minimal coding!

## What You'll Get

Automatic email reminders for:
- 🚗 Vehicle documents expiring
- 👨‍✈️ Driver licenses expiring
- 🔧 Maintenance due
- 📝 Missing trip data

## Prerequisites Checklist

- [ ] Supabase project running
- [ ] n8n account (get free at https://n8n.io)
- [ ] Google Workspace email
- [ ] Google Cloud Console access

---

## Step 1: Deploy Database (5 minutes)

```bash
# In your project directory
cd /home/user/Fleet-Management-System---Trip-Sheet-Module3

# Apply migration
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy get-pending-reminders
npx supabase functions deploy mark-notification-sent
```

**Get your credentials:**
1. Go to Supabase Dashboard → Project Settings → API
2. Copy:
   - Project URL
   - Anon public key
   - Service role key (keep secret!)

**Get your Organization ID:**
```sql
-- Run in Supabase SQL Editor
SELECT id, name FROM organizations LIMIT 1;
```

---

## Step 2: Enable Gmail API (5 minutes)

1. Go to: https://console.cloud.google.com
2. Enable **Gmail API**:
   - APIs & Services → Library
   - Search "Gmail API" → Enable
3. Create OAuth credentials:
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://YOUR_N8N_DOMAIN/rest/oauth2-credential/callback`
   - **Save Client ID and Client Secret**

---

## Step 3: Setup n8n (10 minutes)

### A. Add Gmail Credential

1. In n8n: Settings → Credentials → Add Credential
2. Search "Gmail OAuth2"
3. Enter:
   - Client ID: (from Google)
   - Client Secret: (from Google)
4. Click "Connect my account"
5. Authorize

### B. Add Supabase Credential

1. Add Credential → "HTTP Header Auth"
2. Settings:
   - Name: `Authorization`
   - Value: `Bearer YOUR_SUPABASE_ANON_KEY`
3. Save as "Supabase Auth"

### C. Import Workflow

1. In n8n: Click "+" → "Import from File"
2. Select: `docs/n8n-reminder-workflow.json`
3. Update these values in the workflow:
   - Replace `YOUR_PROJECT_ID` with your Supabase project ID
   - Replace `YOUR_ORG_ID` with your organization ID (from Step 1)
   - Select credentials in Gmail and HTTP Request nodes
4. Save workflow

---

## Step 4: Configure Contacts (5 minutes)

1. Open your app: http://your-app-url/admin/reminders
2. Add a contact:
   - Name: Your name
   - Email: Your email
   - Preferred contact mode: **Email** or **Both**
   - Assign reminder types: Select **All** (or specific types)
   - Mark as "Global contact"
3. Save

---

## Step 5: Test! (5 minutes)

### A. Create a Test Reminder

```sql
-- Run in Supabase SQL Editor
INSERT INTO reminder_tracking (
  reminder_id,
  reminder_type,
  entity_id,
  entity_type,
  module,
  title,
  due_date,
  days_left,
  priority,
  status,
  link,
  organization_id,
  added_by
) VALUES (
  'test-' || gen_random_uuid()::text,
  'rc_expiry',
  'TEST-VEHICLE-001',
  'vehicle',
  'vehicles',
  'Test Reminder: Vehicle RC Expiring Soon',
  CURRENT_DATE + INTERVAL '5 days',
  5,
  'warning',
  'active',
  '/vehicles/TEST-VEHICLE-001',
  'YOUR_ORG_ID', -- Replace with your org ID
  (SELECT id FROM users LIMIT 1)
);
```

### B. Test Supabase Function

```bash
curl "https://YOUR_PROJECT_ID.supabase.co/functions/v1/get-pending-reminders?organization_id=YOUR_ORG_ID&method=email&days_ahead=7" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

You should see your test reminder with contact info.

### C. Run n8n Workflow

1. In n8n, open the workflow
2. Click "Test workflow" button
3. Click "Execute workflow"
4. Watch it run through each node
5. **Check your email!** 📧

### D. Verify in Database

```sql
-- Check sent notifications
SELECT * FROM reminder_notifications
WHERE status = 'sent'
ORDER BY sent_at DESC;
```

---

## Step 6: Activate & Go Live (2 minutes)

1. In n8n workflow, toggle "Active" switch to ON
2. The workflow will now run automatically every hour
3. Done! 🎉

---

## 📝 Add Templates (Optional)

Make emails prettier with custom templates:

1. Go to: http://your-app-url/admin/reminders
2. Click "Templates" tab
3. Add template:

**Example for Vehicle RC:**
```
Subject: Urgent: Vehicle RC Expiring in {days_left} Days

Dear {recipient_name},

This is an urgent reminder:

Vehicle RC is expiring soon!
Due Date: {due_date}
Days Remaining: {days_left}
Priority: {priority}

Please renew immediately to avoid penalties.

View vehicle details: {link}

Thank you,
Fleet Management Team
```

**Available variables:**
- `{recipient_name}` - Contact name
- `{title}` - Reminder title
- `{due_date}` - Expiry date
- `{days_left}` - Days remaining
- `{priority}` - critical/warning/normal
- `{link}` - Direct link
- `{entity_type}` - vehicle/driver/etc
- `{reminder_type}` - rc_expiry/insurance/etc

---

## 🎛️ Customize Schedule

Want different frequencies? Edit the Schedule node in n8n:

**For critical reminders only (every 6 hours):**
1. Duplicate workflow
2. Schedule node: Hours = 6
3. HTTP Request node: Add `&priority=critical` to URL

**For daily digest at 9 AM:**
1. Schedule node: Mode = "Every Day"
2. Time: 09:00

**For weekly summary:**
1. Schedule node: Mode = "Every Week"
2. Day: Monday
3. Time: 09:00

---

## 🐛 Troubleshooting

### No emails received?

1. **Check contacts**: Go to `/admin/reminders`, verify contact has email and assigned types
2. **Check reminders**: Run SQL:
   ```sql
   SELECT * FROM reminder_tracking WHERE status = 'active' LIMIT 10;
   ```
3. **Check n8n logs**: Executions → View failed executions
4. **Test Gmail**: Send test email from Gmail node directly

### "No reminders found" in n8n?

- Check `days_ahead` parameter (increase to 30)
- Verify organization_id matches
- Check if reminders have `status = 'active'`

### Authorization error?

- Verify Supabase anon key is correct
- Check if RLS policies are enabled
- Try using service role key instead (for testing only)

---

## 📊 Monitor Performance

### Daily Stats Dashboard

```sql
-- Emails sent today
SELECT
  COUNT(*) as total_sent,
  COUNT(DISTINCT reminder_id) as unique_reminders,
  COUNT(DISTINCT recipient_email) as unique_recipients
FROM reminder_notifications
WHERE status = 'sent'
  AND DATE(sent_at) = CURRENT_DATE;
```

### Failure Rate

```sql
-- Check failures
SELECT
  DATE(created_at) as date,
  COUNT(*) as failures,
  array_agg(DISTINCT error_message) as errors
FROM reminder_notifications
WHERE status = 'failed'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at);
```

---

## 🚀 Next Steps

### Add More Reminder Types

The system already tracks:
- ✅ Vehicle: RC, Insurance, PUC, Fitness, Permit
- ✅ Driver: License expiry
- ✅ Maintenance: Service due (by date and odometer)
- ✅ Trips: Missing fuel bills, missing end km

Add more in: `src/utils/reminders.ts`

### Add SMS Notifications

1. Sign up: https://www.twilio.com
2. Get API credentials
3. Duplicate n8n workflow
4. Replace Gmail node with Twilio node
5. Change URL parameter: `method=sms`

### Create Priority-Based Workflows

- **Critical**: Every 4 hours + SMS
- **Warning**: Daily at 9 AM
- **Normal**: Weekly digest

---

## 💡 Pro Tips

1. **Test with your own email first** before adding team contacts
2. **Start with 1-hour schedule**, then adjust based on volume
3. **Monitor Gmail quotas**: Free = 500/day, Workspace = 2000/day
4. **Use BCC in Gmail node** to monitor all sent emails
5. **Create separate workflows per reminder type** for fine control
6. **Set up n8n error notifications** to catch failures quickly

---

## 📚 Full Documentation

For detailed setup, see: `docs/N8N_EMAIL_REMINDER_SETUP.md`

---

## ✅ Success Checklist

- [ ] Database migration applied
- [ ] Edge functions deployed
- [ ] Gmail API enabled
- [ ] n8n credentials configured
- [ ] Workflow imported and activated
- [ ] Test contact added
- [ ] Test reminder created
- [ ] Test email received
- [ ] Workflow active and running

---

**🎉 You're done! Reminders are now automated.**

Your team will receive emails for:
- Documents expiring in 7 days
- Maintenance due soon
- Missing trip data
- Any active reminders in the system

**Questions?** Check the full guide or review n8n execution logs.
