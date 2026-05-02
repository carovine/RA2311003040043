Stage 2
1. MongoDB is the best fit for this notification platform
2. Notification objects are naturally JSON
3. Easier to work with REST APIs
4. Data model
{
  "_id": "ObjectId",
  "recipientId": "string",
  "type": "string",
  "title": "string",
  "message": "string",
  "channel": "string",
  "priority": "string",
  "metadata": { "any": "any" },
  "status": "string",
  "createdAt": "ISODate",
  "readAt": "ISODate|null",
  "deliveredAt": "ISODate|null",
  "acknowledgedAt": "ISODate|null",
  "expiresAt": "ISODate|null",
  "deleted": "boolean"
}
5. userpreferences collection
{
  "_id": "ObjectId",
  "userId": "string",
  "enabledChannels": ["in-app", "email", "push"],
  "autoRead": "boolean",
  "preferences": {
    "marketing": "boolean",
    "system": "boolean",
    "reminders": "boolean"
  },
  "updatedAt": "ISODate"
}
6. NoSql command:
db.notifications.insertOne({
  recipientId: "user-123",
  type: "ACCOUNT_ALERT",
  title: "Payment failed",
  message: "Your invoice payment could not be processed.",
  channel: "in-app",
  priority: "high",
  metadata: { invoiceId: "inv-987" },
  status: "pending",
  createdAt: new Date(),
  readAt: null,
  deliveredAt: null,
  acknowledgedAt: null,
  expiresAt: new Date("2026-05-05T18:00:00Z"),
  deleted: false
})
7. Updating user preference
db.userPreferences.updateOne(
  { userId: "user-123" },
  {
    $set: {
      enabledChannels: ["in-app", "email"],
      autoRead: false,
      preferences: { marketing: false, system: true, reminders: true },
      updatedAt: new Date()
    }
  },
  { upsert: true }
)
