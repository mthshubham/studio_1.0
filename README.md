# InstaChronicle

InstaChronicle is a web application that allows you to view and search your Instagram message history from your official data export. Simply upload your `messages.zip` file, and you can browse through all your conversations in a clean and user-friendly interface. It's built with Next.js, TypeScript, and Tailwind CSS.

This application runs entirely in your browser. Your message data is processed locally and is never uploaded to any server, ensuring your privacy.

## Features

-   **Secure & Private**: All file processing happens locally in your browser. Your data is never sent anywhere.
-   **Easy Upload**: Select your Instagram `messages.zip` file to get started.
-   **Conversation List**: View all your chats, sorted by the most recent activity, with participant counts.
-   **Full Chat History**: Reads all `message_x.json` files to load your complete conversation history.
-   **Efficient Scrolling**: Uses virtualization to smoothly handle even very large conversations with tens of thousands of messages.
-   **Emoji Support**: Correctly decodes and displays emojis.
-   **Search**: Quickly find specific messages within a chat.
-   **Date Picker**: Jump to a specific date in your conversation history.
-   **Light/Dark Mode**: Switch between themes for comfortable viewing.

## Getting Your Instagram Data

Before you can use the app, you need to request your data from Instagram.

1.  Go to your Instagram profile, then **Settings > Your activity > Download your information**.
2.  Request a download.
3.  Select **JSON** as the format and a date range. For your full history, select **All time**.
4.  Make sure you select **Messages** as the data to download.
5.  Instagram will email you a link to download your data. It will come as a `.zip` file (e.g., `yourusername_20230101.zip`).

## Installation and Setup

Follow these steps to get the project running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 18.x or later recommended)
-   [npm](https://www.npmjs.com/) (usually comes with Node.js)

### 1. Clone the repository

First, clone the project to your local machine:

```bash
git clone https://github.com/your-repo/instachronicle.git
cd instachronicle
```

### 2. Install dependencies

Install the required npm packages by running:

```bash
npm install
```

### 3. Run the development server

Once the dependencies are installed, you can start the local development server:

```bash
npm run dev
```

This will start the application on `http://localhost:9002` (as configured in `package.json`). Open this URL in your browser to use the app.

## How to Use

1.  Run the application locally using the steps above.
2.  Open your browser and navigate to `http://localhost:9002`.
3.  Click the **Select Zip File** button and choose the `.zip` file you downloaded from Instagram.
4.  The app will process your file and display a list of all your conversations.
5.  Click on any conversation to view the full chat history.

## Available Scripts

-   `npm run dev`: Starts the Next.js development server.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts a production server for the built application.
-   `npm run lint`: Lints the code using Next.js's built-in ESLint configuration.
