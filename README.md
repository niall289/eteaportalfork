# FootCare Clinic Admin Portal

An administrative dashboard for FootCare Clinic that displays patient interactions from the Fiona chatbot.

## Features

- Real-time patient data synchronization via webhook
- Interactive clinic location visualization
- Patient interaction history and analytics
- Risk assessment and flagging system
- Mobile-responsive design

## Technologies Used

- React for the frontend
- Express for the backend
- WebSockets for real-time updates
- PostgreSQL for data storage
- Tailwind CSS for styling

## Setup

run `npm run dev` in /server and /web; browse http://localhost:5173.

## Environment Variables

The following environment variables are required:

- `DATABASE_URL`: PostgreSQL connection string

## Chatbot Integration

To connect the Fiona chatbot to this admin portal:

1. Find where your chatbot processes completed conversations
2. Add code to send the data to your portal's webhook endpoint at `/api/webhook/chatbot`
3. Ensure the data includes patient information, clinic selection, and conversation history

## License

Private - FootCare Clinic