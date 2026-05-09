ALTER TABLE organization_chatbot_settings
ADD COLUMN IF NOT EXISTS booking_flow JSONB NOT NULL DEFAULT '{
  "version": 1,
  "steps": [
    {
      "id": "date_time",
      "type": "date_time",
      "question": "When would you like to come?",
      "helperText": "Choose a date and time.",
      "options": [
        { "label": "Tonight 7:00 PM", "value": "tonight 7:00 PM" },
        { "label": "Tonight 8:30 PM", "value": "tonight 8:30 PM" },
        { "label": "Tomorrow 7:00 PM", "value": "tomorrow 7:00 PM" },
        { "label": "Tomorrow 8:30 PM", "value": "tomorrow 8:30 PM" }
      ]
    },
    {
      "id": "party_size",
      "type": "party_size",
      "question": "How many guests?",
      "helperText": "Pick your party size.",
      "options": [1, 2, 3, 4, 5, 6, 7, 8]
    }
  ]
}'::jsonb;
