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

1. Clone this repository
2. Install dependencies with `npm install`
3. Set up environment variables (see below)
4. Start the development server with `npm run dev`

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