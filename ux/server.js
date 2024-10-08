const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const chokidar = require('chokidar');
const { exec, execSync } = require('child_process');
const hljs = require('highlight.js');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataFilePath = (userId) => path.join(__dirname, `formData_${userId}.json`);
const chatTranscriptPath = (userId) => path.join(__dirname, `chatTranscript_${userId}.json`);
const userInputPath = (userId) => path.join(__dirname, `user-input_${userId}.txt`);

let clients = [];
let watcher = null;

app.get('/events/:userId/:sessionId', async (req, res) => {
  const userId = req.params.userId;
  const sessionId = userId; //reqs.params.sessionId

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  
  if (!clients[userId]) {
    clients[userId] = [];
  }
  clients[userId].push(newClient);

  req.on('close', () => {
    clients[userId] = clients[userId].filter(client => client.id !== clientId);
  });


  // Send initial data to the client
  const initialData = await getInitialData(userId, sessionId);
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);

  res.write('data: connected\n\n');
});

async function getInitialData(userId, sessionId) {
  try {
    const [formData, chatTranscript, userInput] = await Promise.all([
      readFileJSON(dataFilePath(userId)),
      readFileJSON(chatTranscriptPath(sessionId)),
      readFileText(userInputPath(userId))
    ]);
    return { formData, chatTranscript: chatTranscript, userInput };
  } catch (error) {
    console.error('Error reading initial data:', error);
    return { formData: null, chatTranscript: null, userInput: '' };
  }
}

function sendEventsToAll(userId, data) {
  if (clients[userId]) {
    clients[userId].forEach(client => client.res.write(`data: ${JSON.stringify(data)}\n\n`));
  }
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

async function sendUpdates(userId, sessionId) {
  try {
    const [formData, chatTranscript, userInput] = await Promise.all([
      readFileJSON(dataFilePath(userId)),
      readFileJSON(chatTranscriptPath(sessionId)),
      readFileText(userInputPath(userId))
    ]);
    sendEventsToAll(userId, { formData, chatTranscript, userInput });
  } catch (error) {
    console.error('Error reading files:', error);
  }
}



app.post('/initialize/:userId/:sessionId', async (req, res) => {

  const userId = req.params.userId;
  const sessionId = userId; //req.params.sessionId TBD
  
  console.log("initializing " + userId)

  async function fileExists(filepath) {
    try {
      await fs.access(filepath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  const chatTranscriptExists = await fileExists(path.join(__dirname, `chatTranscript_${sessionId}.json`));

  // console.log("file exists: " + chatTranscriptExists)

  if(!chatTranscriptExists) {
    const scriptPath = path.join(__dirname, '..', 'reset.py');
    const command = `python3 "${scriptPath}" "${userId}"`;

    console.log('Executing command:', command); // Debug output

    await exec(command, { detached: true }, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error in initialization: ${error}`);
        return res.status(500).send('Error running reset script');
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
      res.status(200).send('reset script executed successfully');
    });
  }

  

  const { dataFilePath, chatTranscriptPath, userInputPath } = {
    dataFilePath: path.join(__dirname, `formData_${userId}.json`),
    chatTranscriptPath: path.join(__dirname, `chatTranscript_${sessionId}.json`),
    userInputPath: path.join(__dirname, `user-input_${userId}.txt`)
  }

  // Close existing watcher if it exists
  if (watcher) {
    console.log("closing watcher")
    watcher.close();
  }

  // Set up new watcher for this user's files
  watcher = chokidar.watch([dataFilePath, chatTranscriptPath, userInputPath], {
    usePolling: true,
    interval: 500
  });

  watcher.on('change', (path) => {
    sendUpdates(userId, sessionId);
  });

  res.status(200).send('Initialization complete');
});

app.post('/save/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  try {
    await fs.writeFile(dataFilePath(userId), JSON.stringify(req.body, null, 2));
    res.status(200).send('Data saved successfully');
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).send('Error saving data');
  }
});

app.post('/saveUserInput/:userId', async (req, res) => {

  const userId = req.params.userId;
  userInput = req.body.userInput

  const scriptPath = path.join(__dirname, '..', 'saveUserInput.py');
  const command = `python3 "${scriptPath}" "${userId}" "${userInput}"`;


  await exec(command, { detached: true }, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send('Error running saveUserInput.py');
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    res.status(200).send('script saveUserInput.py executed successfully');
  });
  
});

app.post('/auto-chat', (req, res) => {
  exec('python3 ../clientBot.py; python3 ../chatBotHandler.py', { detached: true }, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send('Error running reset script');
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    res.status(200).send('autochat command executed successfully');
  });
});

app.post('/runChatBot/:userId/:sessionId', (req, res) => {

  

  const userId = req.params.userId;
  const sessionId = userId; // req.params.sessionId
  const userInput = req.body.userInput
  
  
  const command = `python3 ../chatBotHandler.py ${userId} ${sessionId} "${userInput}" &`;
  // const command = "echo hello"

  console.log('Run chatbot Executing command:', command); // Debug output

  console.log("run command")


  exec(command, { detached: true }, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send('Error running chatbothandler script');
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    res.status(200).send('chatbothandler script executed successfully');
  });


});

app.post('/reset/:userId', (req, res) => {
  const userId = req.params.userId;
  
  console.log("resetting usr " + userId)
  
  const scriptPath = path.join(__dirname, '..', 'reset.py');
  const command = `python3 "${scriptPath}" "${userId}"`;

  console.log('Executing command:', command); // Debug output

  exec(command, { detached: true }, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send('Error running reset script');
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    res.status(200).send('reset script executed successfully');
  });
});

app.get('/data-state', async (req, res) => {
  try {
    const dataStatePath = path.join(__dirname, '../storage/data_state.txt');
    const dataStateText = await fs.readFile(dataStatePath, 'utf8');
    
    // Parse the text content as JSON
    const dataState = JSON.parse(dataStateText);


    res.setHeader('Content-Type', 'application/json');
    res.send(dataState);
  } catch (error) {
    console.error('Error reading data_state.txt:', error);
    res.status(500).send('Error reading data state');
  }
});


app.get('/last-content', async (req, res) => {
  try {
    
    const file_text = await fs.readFile(path.join(__dirname, '../storage/last_content.txt'), 'utf8');
    
    // Parse the text content as JSON
    const display_json = JSON.parse(file_text);


    res.setHeader('Content-Type', 'application/json');
    res.send(display_json);
  } catch (error) {
    console.error('Error reading data_state.txt:', error);
    res.status(500).send('Error reading data state');
  }
});



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});