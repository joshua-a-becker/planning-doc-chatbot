const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const chokidar = require('chokidar');
const { exec } = require('child_process');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataFilePath = path.join(__dirname, 'formData.json');
const chatTranscriptPath = path.join(__dirname, 'chatTranscript.json');
const userInputPath = path.join(__dirname, 'user-input.txt');

let clients = [];

app.get('/events', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
  });

  // Send initial data to the client
  const initialData = await getInitialData();
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);

  res.write('data: connected\n\n');
});

async function getInitialData() {
  try {
    const [formData, chatTranscript, userInput] = await Promise.all([
      readFileJSON(dataFilePath),
      readFileJSON(chatTranscriptPath),
      readFileText(userInputPath)
    ]);
    return { formData, chatTranscript: chatTranscript?.messages, userInput };
  } catch (error) {
    console.error('Error reading initial data:', error);
    return { formData: null, chatTranscript: null, userInput: '' };
  }
}

function sendEventsToAll(data) {
  clients.forEach(client => client.res.write(`data: ${JSON.stringify(data)}\n\n`));
}

async function readFileJSON(filepath) {
  try {
    const data = await fs.readFile(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function readFileText(filepath) {
  try {
    return await fs.readFile(filepath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

async function sendUpdates() {
  try {
    const [formData, chatTranscript, userInput] = await Promise.all([
      readFileJSON(dataFilePath),
      readFileJSON(chatTranscriptPath),
      readFileText(userInputPath)
    ]);
    sendEventsToAll({ formData, chatTranscript: chatTranscript?.messages, userInput });
  } catch (error) {
    console.error('Error reading files:', error);
  }
}

chokidar.watch([dataFilePath, chatTranscriptPath, userInputPath])
  .on('change', sendUpdates);

app.post('/save', async (req, res) => {
  console.log(req.body)
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(req.body, null, 2));
    res.status(200).send('Data saved successfully');
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).send('Error saving data');
  }
});

app.post('/saveUserInput', async (req, res) => {
  try {
    await fs.writeFile(userInputPath, req.body.userInput);
    res.status(200).send('User input saved successfully');
  } catch (error) {
    console.error('Error saving user input:', error);
    res.status(500).send('Error saving user input');
  }
});

app.post('/runChatBot', (req, res) => {
  exec('python3 ../chatBotHandler.py', { detached: true }, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send('Error running ChatBot script');
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    res.status(200).send('ChatBot script executed successfully');
  });
});

app.post('/reset', (req, res) => {
  exec('python3 ../reset.py', { detached: true }, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send('Error running reset script');
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    res.status(200).send('reset script executed successfully');
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});