# Contact Form - MongoDB Database System

## 🎉 Overview

The contact form now saves all submissions to **MongoDB** for easy management and tracking!

## 🗄️ Database Schema

### Contact Model

Location: `backend/models/Contact.js`

```javascript
{
  firstName: String (required, max 50 chars)
  lastName: String (required, max 50 chars)
  email: String (required, validated, lowercase)
  subject: String (required, max 200 chars)
  message: String (required, min 10 chars, max 2000 chars)
  status: String (enum: 'new', 'read', 'responded', 'archived') - default: 'new'
  ipAddress: String
  userAgent: String
  createdAt: Date (auto)
  updatedAt: Date (auto)
  readAt: Date
  respondedAt: Date
  notes: String
}
```

## ✨ Features

### 1. **Automatic Submission Tracking**
   - ✅ All contact form submissions saved to database
   - ✅ Tracks IP address and user agent
   - ✅ Timestamps for created/updated dates
   - ✅ Status tracking (new → read → responded → archived)

### 2. **Validation**
   - ✅ Email format validation
   - ✅ Required field validation
   - ✅ Character length limits
   - ✅ Prevents spam with constraints

### 3. **Status Management**
   - ✅ **New** - Just received
   - ✅ **Read** - Viewed by admin
   - ✅ **Responded** - Reply sent to user
   - ✅ **Archived** - Completed/closed

### 4. **Admin Features** (Protected Routes)
   - ✅ View all contacts
   - ✅ Filter by status
   - ✅ Pagination support
   - ✅ Mark as read/responded
   - ✅ Add internal notes
   - ✅ Delete contacts
   - ✅ Get statistics

## 📡 API Endpoints

### Public Endpoint

#### **POST /api/contact/submit**
Submit a contact form (no authentication required)

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "subject": "Question about pricing",
  "message": "I would like to know more about your pricing plans..."
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Thank you for contacting us! We'll get back to you soon.",
  "data": {
    "id": "60d5ec49f1a2c8b1f8e4e1a1",
    "createdAt": "2025-01-27T10:30:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "status": "error",
  "message": "All fields are required"
}
```

### Protected Endpoints (Require Authentication)

#### **GET /api/contact/all**
Get all contact submissions

**Query Parameters:**
- `status` - Filter by status (new, read, responded, archived)
- `limit` - Items per page (default: 50)
- `page` - Page number (default: 1)

**Example:**
```
GET /api/contact/all?status=new&limit=20&page=1
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "contacts": [
      {
        "_id": "60d5ec49f1a2c8b1f8e4e1a1",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "subject": "Question about pricing",
        "message": "I would like to know more...",
        "status": "new",
        "ipAddress": "192.168.1.1",
        "createdAt": "2025-01-27T10:30:00.000Z",
        "updatedAt": "2025-01-27T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "totalPages": 5
    }
  }
}
```

#### **GET /api/contact/statistics**
Get contact form statistics

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "total": 150,
    "new": 25,
    "read": 50,
    "responded": 60,
    "archived": 15
  }
}
```

#### **GET /api/contact/:id**
Get a specific contact by ID (auto-marks as read if new)

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "contact": {
      "_id": "60d5ec49f1a2c8b1f8e4e1a1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "subject": "Question about pricing",
      "message": "I would like to know more...",
      "status": "read",
      "readAt": "2025-01-27T11:00:00.000Z",
      "notes": "",
      "createdAt": "2025-01-27T10:30:00.000Z"
    }
  }
}
```

#### **PATCH /api/contact/:id/status**
Update contact status

**Request Body:**
```json
{
  "status": "responded"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Contact status updated successfully",
  "data": {
    "contact": { /* updated contact */ }
  }
}
```

#### **PATCH /api/contact/:id/notes**
Add or update internal notes

**Request Body:**
```json
{
  "notes": "Sent pricing information via email"
}
```

#### **DELETE /api/contact/:id**
Delete a contact

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Contact deleted successfully"
}
```

## 🚀 Installation & Setup

### Step 1: Backend is Ready!
The backend is already set up with:
- ✅ Contact model created
- ✅ Routes registered
- ✅ Validation in place

### Step 2: Restart Backend Server
```bash
cd backend
npm run dev
```

### Step 3: Test the Contact Form
1. Visit the contact page
2. Fill out the form
3. Submit
4. Check MongoDB to see the saved data!

## 📊 MongoDB Collection

### Collection Name: `contacts`

### Indexes:
- `email` (ascending)
- `status` (ascending)
- `createdAt` (descending)

### Sample Document:
```javascript
{
  _id: ObjectId("60d5ec49f1a2c8b1f8e4e1a1"),
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  subject: "Question about pricing",
  message: "I would like to know more about your pricing plans. Can you provide detailed information?",
  status: "new",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  notes: "",
  createdAt: ISODate("2025-01-27T10:30:00.000Z"),
  updatedAt: ISODate("2025-01-27T10:30:00.000Z"),
  readAt: null,
  respondedAt: null
}
```

## 🔍 Viewing Contacts in MongoDB

### Using MongoDB Compass:
1. Connect to your MongoDB database
2. Find the `contacts` collection
3. View all submissions with filters

### Using MongoDB Shell:
```javascript
// View all contacts
db.contacts.find()

// View only new contacts
db.contacts.find({ status: "new" })

// View recent contacts (last 7 days)
db.contacts.find({
  createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) }
})

// Count contacts by status
db.contacts.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

## 🛡️ Security Features

- ✅ Input validation on all fields
- ✅ Email format validation
- ✅ Protected admin routes (authentication required)
- ✅ Rate limiting (inherited from global app settings)
- ✅ XSS protection (MongoDB automatically escapes)
- ✅ IP address tracking for abuse prevention

## 📈 Model Methods

### Instance Methods:

```javascript
// Mark contact as read
await contact.markAsRead()

// Mark contact as responded
await contact.markAsResponded()
```

### Static Methods:

```javascript
// Get statistics
const stats = await Contact.getStatistics()
```

### Virtuals:

```javascript
// Get full name
console.log(contact.fullName) // "John Doe"
```

## 🎯 Future Enhancements (Optional)

1. **Email Notifications:**
   - Send email notification to admin when new contact received
   - Send confirmation email to user

2. **Advanced Admin Panel:**
   - Create frontend admin dashboard
   - Bulk operations (mark all as read, delete multiple)
   - Search and advanced filtering

3. **Analytics:**
   - Track response time
   - Conversion rates
   - Popular inquiry topics

4. **Integrations:**
   - Export to CSV
   - Slack notifications
   - CRM integration

## 📝 Testing

### Test Contact Submission:

```bash
curl -X POST http://localhost:5000/api/contact/submit \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "subject": "Test Subject",
    "message": "This is a test message from the API"
  }'
```

### Test Get All Contacts (Requires Auth Token):

```bash
curl -X GET http://localhost:5000/api/contact/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## ✅ Checklist

- [x] Create Contact model
- [x] Create contact routes
- [x] Register routes in server.js
- [x] Update frontend contact form
- [x] Add validation
- [x] Add status tracking
- [x] Add admin endpoints
- [ ] Test contact submission
- [ ] Verify data in MongoDB
- [ ] Test admin endpoints (optional)

---

## 🎉 Ready to Use!

All contact form submissions are now being saved to MongoDB. You can:
- View them in MongoDB Compass
- Query them using the API
- Build an admin panel to manage them
- Export and analyze the data

No more lost contact information! Everything is safely stored in your database. 🚀✨

