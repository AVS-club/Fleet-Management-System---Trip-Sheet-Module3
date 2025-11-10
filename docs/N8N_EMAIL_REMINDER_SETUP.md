# n8n Email Reminder System Setup Guide

Complete guide to set up automated email reminders using n8n, Supabase, and Google Workspace.

## 🎯 Overview

This system sends automated email reminders for:
- Vehicle documents (RC, Insurance, PUC, Fitness, Permit)
- Driver license expiry
- Maintenance schedules
- Trip missing data
- AI alerts

**Architecture:**
```
Supabase (Database) → Edge Function → n8n (Automation) → Gmail API → Recipients
```

---

## 📋 Prerequisites

- ✅ Supabase project (you have this)
- ✅ n8n instance (cloud or self-hosted)
- ✅ Google Workspace account
- ✅ Google Cloud Console access

---

## Part 1: Google Workspace API Setup

### Step 1: Enable Gmail API

1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Select your project or create a new one
3. Click **"APIs & Services" → "Library"**
4. Search for **"Gmail API"**
5. Click **"Enable"**

### Step 2: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" → "Credentials"**
2. Click **"Create Credentials" → "OAuth client ID"**
3. If prompted, configure OAuth consent screen:
   - User Type: **Internal** (for Google Workspace) or **External**
   - App name: **Fleet Management Reminders**
   - User support email: Your email
   - Scopes: Add `https://www.googleapis.com/auth/gmail.send`
   - Test users: Add your email(s)
4. Create OAuth Client:
   - Application type: **Web application**
   - Name: **n8n Gmail Integration**
   - Authorized redirect URIs: `https://YOUR_N8N_URL/rest/oauth2-credential/callback`
5. **Save these credentials:**
   - Client ID
   - Client secret

### Step 3: Create Service Account (Alternative Method)

For production, you can use a Service Account with Domain-Wide Delegation:

1. Go to **"APIs & Services" → "Credentials"**
2. Click **"Create Credentials" → "Service Account"**
3. Fill in:
   - Service account name: **fleet-reminders**
   - Service account ID: auto-generated
   - Click **"Create and Continue"**
4. Grant role: **Project → Viewer**
5. Click **"Done"**
6. Click on the created service account
7. Go to **"Keys"** tab
8. Click **"Add Key" → "Create new key"**
9. Select **JSON** format
10. **Save the downloaded JSON file** (you'll need this for n8n)

### Step 4: Enable Domain-Wide Delegation (Service Account only)

1. In the service account details, click **"Show Domain-Wide Delegation"**
2. Enable **"Enable Google Workspace Domain-wide Delegation"**
3. Note the **Client ID**
4. Go to **Google Workspace Admin Console**: https://admin.google.com
5. Go to **Security → API Controls → Domain-wide Delegation**
6. Click **"Add new"**
7. Enter:
   - Client ID: (from service account)
   - OAuth Scopes: `https://www.googleapis.com/auth/gmail.send`
8. Click **"Authorize"**

---

## Part 2: Supabase Configuration

### Step 1: Run Database Migration

```bash
# Apply the migration
npx supabase db push

# Or if using Supabase CLI
supabase migration up
```

This creates the `reminder_notifications` table to track email sending.

### Step 2: Deploy Edge Functions

```bash
# Deploy get-pending-reminders function
npx supabase functions deploy get-pending-reminders

# Deploy mark-notification-sent function
npx supabase functions deploy mark-notification-sent
```

### Step 3: Get Your Credentials

You'll need these for n8n:
- **Supabase URL**: Found in Project Settings → API
- **Supabase Anon Key**: Found in Project Settings → API
- **Supabase Service Role Key**: Found in Project Settings → API (keep secret!)

### Step 4: Get Your Organization ID

```sql
-- Run this in Supabase SQL Editor
SELECT id, name FROM organizations;
```

Save your organization ID - you'll need it for n8n.

---

## Part 3: n8n Setup

### Step 1: Install n8n (if not already)

**Option A: Cloud (Easiest)**
- Sign up at https://n8n.io
- No installation needed!

**Option B: Self-Hosted with Docker**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**Option C: npm**
```bash
npm install n8n -g
n8n start
```

Access n8n at: http://localhost:5678

### Step 2: Add Gmail Credentials to n8n

1. In n8n, go to **"Settings" → "Credentials"**
2. Click **"Add Credential"**
3. Search for **"Gmail OAuth2"**

**For OAuth2 method:**
- Name: `Gmail - Fleet Reminders`
- Client ID: (from Google Console)
- Client Secret: (from Google Console)
- Click **"Connect my account"**
- Authorize in Google

**For Service Account method:**
- Name: `Gmail Service Account`
- Service Account Email: (from JSON file)
- Private Key: (from JSON file)
- Delegated Email: Your sending email address

### Step 3: Add HTTP Request Credentials for Supabase

1. Click **"Add Credential"**
2. Search for **"HTTP Header Auth"**
3. Add credential:
   - Name: `Supabase Auth`
   - Name: `Authorization`
   - Value: `Bearer YOUR_SUPABASE_ANON_KEY`

---

## Part 4: Create n8n Workflow

### Workflow Overview

The workflow will:
1. **Trigger** every hour (or your preferred schedule)
2. **Call Supabase** Edge Function to get pending reminders
3. **Loop through reminders** and contacts
4. **Send emails** via Gmail
5. **Mark as sent** in Supabase

### Step-by-Step Workflow Creation

#### Node 1: Schedule Trigger

1. Add **"Schedule Trigger"** node
2. Configure:
   - Trigger Interval: `Hours`
   - Hours Between Triggers: `1` (or adjust as needed)
   - Mode: `Every X`

#### Node 2: Get Pending Reminders (HTTP Request)

1. Add **"HTTP Request"** node
2. Configure:
   - Method: `GET`
   - URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/get-pending-reminders`
   - Query Parameters:
     - `organization_id`: `YOUR_ORG_ID`
     - `method`: `email`
     - `days_ahead`: `7`
     - `limit`: `100`
   - Authentication: `Generic Credential Type`
   - Generic Auth Type: `HTTP Header Auth`
   - Credential for HTTP Header Auth: `Supabase Auth` (created earlier)

#### Node 3: Check If Reminders Exist (IF node)

1. Add **"IF"** node
2. Configure:
   - Condition: `{{ $json.count > 0 }}`

#### Node 4: Split Reminders Array

1. Connect to **TRUE** output of IF node
2. Add **"Item Lists"** node
3. Configure:
   - Operation: `Split Out Items`
   - Field to Split Out: `reminders`

#### Node 5: Split Contacts for Each Reminder

1. Add another **"Item Lists"** node
2. Configure:
   - Operation: `Split Out Items`
   - Field to Split Out: `contacts`

#### Node 6: Prepare Email Content

1. Add **"Set"** node
2. Configure to set variables:
   ```javascript
   // Add these as expressions:
   {
     "recipientEmail": "{{ $json.email }}",
     "recipientName": "{{ $json.name }}",
     "reminderId": "{{ $('Item Lists').item.json.reminder_id }}",
     "entityId": "{{ $('Item Lists').item.json.entity_id }}",
     "entityType": "{{ $('Item Lists').item.json.entity_type }}",
     "reminderType": "{{ $('Item Lists').item.json.reminder_type }}",
     "title": "{{ $('Item Lists').item.json.title }}",
     "dueDate": "{{ $('Item Lists').item.json.due_date }}",
     "daysLeft": "{{ $('Item Lists').item.json.days_left }}",
     "priority": "{{ $('Item Lists').item.json.priority }}",
     "link": "{{ $('Item Lists').item.json.link }}",
     "subject": "{{ $('Item Lists').item.json.template?.subject || 'Reminder: ' + $('Item Lists').item.json.title }}",
     "messageTemplate": "{{ $('Item Lists').item.json.template?.message || '' }}"
   }
   ```

#### Node 7: Build Email Body (Code node)

1. Add **"Code"** node
2. Configure:
```javascript
const item = $input.item.json;

// Replace template variables
let message = item.messageTemplate || `
Dear ${item.recipientName},

This is a reminder regarding: ${item.title}

Due Date: ${new Date(item.dueDate).toLocaleDateString()}
Days Remaining: ${item.daysLeft} days
Priority: ${item.priority.toUpperCase()}

Please take necessary action.

View details: ${item.link}

This is an automated reminder from Fleet Management System.
`;

// Replace common variables in template
message = message
  .replace(/\{recipient_name\}/g, item.recipientName)
  .replace(/\{title\}/g, item.title)
  .replace(/\{due_date\}/g, new Date(item.dueDate).toLocaleDateString())
  .replace(/\{days_left\}/g, item.daysLeft)
  .replace(/\{priority\}/g, item.priority)
  .replace(/\{link\}/g, item.link)
  .replace(/\{entity_type\}/g, item.entityType)
  .replace(/\{reminder_type\}/g, item.reminderType);

return {
  ...item,
  emailBody: message
};
```

#### Node 8: Send Email (Gmail node)

1. Add **"Gmail"** node
2. Configure:
   - Resource: `Message`
   - Operation: `Send`
   - To: `{{ $json.recipientEmail }}`
   - Subject: `{{ $json.subject }}`
   - Message Type: `Text`
   - Message: `{{ $json.emailBody }}`
   - Options:
     - BCC: (optional - add your monitoring email)

#### Node 9: Mark Notification as Sent

1. Add **"HTTP Request"** node
2. Configure:
   - Method: `POST`
   - URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/mark-notification-sent`
   - Authentication: `Generic Credential Type`
   - Generic Auth Type: `HTTP Header Auth`
   - Credential: `Supabase Auth`
   - Body Content Type: `JSON`
   - Specify Body: `Using JSON`
   - JSON Body:
   ```json
   {
     "reminder_id": "={{ $('Set').item.json.reminderId }}",
     "entity_id": "={{ $('Set').item.json.entityId }}",
     "entity_type": "={{ $('Set').item.json.entityType }}",
     "reminder_type": "={{ $('Set').item.json.reminderType }}",
     "notification_method": "email",
     "recipient_email": "={{ $json.recipientEmail }}",
     "recipient_name": "={{ $json.recipientName }}",
     "subject": "={{ $json.subject }}",
     "message_body": "={{ $json.emailBody }}",
     "template_used": "={{ $('Set').item.json.reminderType }}",
     "status": "sent",
     "n8n_execution_id": "={{ $execution.id }}",
     "organization_id": "YOUR_ORG_ID",
     "metadata": {
       "sent_at": "={{ $now }}",
       "gmail_message_id": "={{ $json.id }}"
     }
   }
   ```

#### Node 10: Handle Errors (Error Trigger)

1. Add **"Error Trigger"** node
2. Connect to a **"HTTP Request"** node
3. Configure to log failed notifications:
   - Same as Node 9 but with `"status": "failed"`
   - Add `"error_message": "={{ $json.error }}"`

---

## Part 5: Testing

### Test 1: Check Supabase Edge Function

```bash
curl "https://YOUR_PROJECT_ID.supabase.co/functions/v1/get-pending-reminders?organization_id=YOUR_ORG_ID&method=email&days_ahead=7" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Expected response:
```json
{
  "success": true,
  "count": 5,
  "reminders": [...]
}
```

### Test 2: Test n8n Workflow Manually

1. In n8n, click **"Execute Workflow"**
2. Check each node's output
3. Verify email was received
4. Check `reminder_notifications` table in Supabase

### Test 3: Verify Database Entries

```sql
-- Check sent notifications
SELECT * FROM reminder_notifications
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 10;
```

---

## Part 6: Production Setup

### Configure Contacts

1. Go to your app: `/admin/reminders`
2. Add contacts with:
   - Email addresses
   - Assign reminder types
   - Set preferred contact mode to "Email" or "Both"

### Configure Templates

1. In the Reminders page, add templates
2. Use these variables in templates:
   - `{recipient_name}` - Contact's name
   - `{title}` - Reminder title
   - `{due_date}` - Due date
   - `{days_left}` - Days remaining
   - `{priority}` - Priority level
   - `{link}` - Direct link to item
   - `{entity_type}` - Type (vehicle, driver, etc.)
   - `{reminder_type}` - Reminder type

Example template:
```
Dear {recipient_name},

This is an urgent reminder about {title}.

Due Date: {due_date}
Days Left: {days_left}
Priority: {priority}

Please review immediately: {link}

Best regards,
Fleet Management Team
```

### Schedule Optimization

**Recommended schedules:**
- **Critical reminders**: Every 6 hours
- **Warning reminders**: Once daily at 9 AM
- **Normal reminders**: Once daily at 6 PM

Create separate workflows for each priority level:
1. Duplicate the workflow
2. Add filter in "Get Pending Reminders" node
3. Adjust schedule trigger

---

## Part 7: Monitoring & Maintenance

### Monitor Email Delivery

```sql
-- Daily email statistics
SELECT
  DATE(sent_at) as date,
  status,
  COUNT(*) as count
FROM reminder_notifications
WHERE notification_method = 'email'
  AND sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(sent_at), status
ORDER BY date DESC;
```

### Monitor Failed Notifications

```sql
-- Check failures
SELECT * FROM reminder_notifications
WHERE status = 'failed'
  AND created_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### n8n Execution History

1. In n8n, go to **"Executions"**
2. Review failed executions
3. Check error messages
4. Retry if needed

### Common Issues & Solutions

**Issue: No reminders returned**
- Check if reminders exist in `reminder_tracking`
- Verify `status = 'active'`
- Check `days_ahead` parameter
- Verify contacts are assigned to reminder types

**Issue: Gmail quota exceeded**
- Gmail has sending limits (500/day for free, 2000/day for Workspace)
- Spread emails across the day
- Use multiple sending accounts
- Consider SendGrid/AWS SES for higher volume

**Issue: Authorization failed**
- Check Supabase anon key
- Verify RLS policies
- Ensure organization_id is correct

---

## Part 8: Next Steps (SMS)

To add SMS notifications:

1. Sign up for:
   - Twilio (https://www.twilio.com)
   - Or AWS SNS
   - Or any SMS provider

2. Duplicate n8n workflow

3. Replace Gmail node with SMS node

4. Change URL parameter: `method=sms`

5. Update contacts with phone numbers

---

## 🎉 Congratulations!

You now have a fully automated email reminder system with:
- ✅ Automatic reminder detection
- ✅ Contact management
- ✅ Template customization
- ✅ Delivery tracking
- ✅ Error handling
- ✅ No coding required (just configuration)

## 📞 Support

If you need help:
1. Check Supabase logs: Project → Logs → Edge Functions
2. Check n8n execution history
3. Review this documentation
4. Check the database tables for data integrity

---

## 📊 Workflow Diagram

```
┌─────────────────┐
│ Schedule Trigger│ (Every hour)
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Get Pending         │
│ Reminders           │
│ (Supabase Function) │
└────────┬────────────┘
         │
         ▼
     ┌───┴───┐
     │  IF   │ (reminders > 0?)
     └───┬───┘
         │ TRUE
         ▼
┌─────────────────┐
│ Split Reminders │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Split Contacts  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Prepare Email   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build Email Body│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send via Gmail  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Mark as Sent        │
│ (Supabase Function) │
└─────────────────────┘
```

---

**Version:** 1.0
**Last Updated:** 2025-01-30
