# **App Name**: ZeroLink

## Core Features:

- Natural Language to Logic Conversion: Convert natural language input into a logic JSON format (trigger + action) using Gemini as a tool.
- Logic QR Code Display: Display the logic JSON as a series of QR codes, rotating every 2 seconds if multi-chunk. QR code generator must support displaying array of strings to handle chunks of a long JSON string.
- QR Code Scanning: Scan QR codes using the device's webcam to load logic into the application.
- Logic Storage: Store scanned logic in Firestore.
- Logic Simulation: Simulate logic execution using a visual sensor simulator (light slider, temperature input, motion toggle).
- Action Trigger: Trigger actions based on simulated sensor data, such as flashing background color, vibrating, and logging events.
- Offline Support: Enable offline functionality for the web app using PWA (Progressive Web App) technologies. Logic should be loaded to the local browser when network is unavailable, or fallback to local storage if Firestore is not accessible.

## Style Guidelines:

- Primary color: Deep purple (#673AB7) for a sense of intelligence and automation.
- Background color: Very light grey (#F5F5F5), near white but softer on the eyes.
- Accent color: Teal (#009688) to highlight interactive elements and QR code visuals.
- Body and headline font: 'Inter' (sans-serif) for a clean and modern look.
- Use simple, clear icons to represent sensor types and actions. Consider filled icons from Material Design.
- Use a grid-based layout to organize the Sender and Receiver modes. Ensure visual separation between input/output sections.
- Incorporate smooth transitions when loading logic, simulating sensor data, and triggering actions. Use subtle animations for QR code rotation.