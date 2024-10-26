const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const chokidar = require('chokidar');
const { exec, execSync } = require('child_process');
const hljs = require('highlight.js');
const util = require('util');
const execPromise = util.promisify(exec);

console.log("startup server")

const app = express();
const PORT = 3001;

// Configuration
const config = {
  basePath: '/data'
};

// useful tool

async function fileExists(filepath) {
  try {
    await fs.access(filepath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}


// Middleware to remove the base path from the URL
app.use((req, res, next) => {
  if (req.path.startsWith(config.basePath)) {
    req.url = req.url.slice(config.basePath.length);
  }
  next();
});

app.use(cors());
app.use(express.json());

const dataFilePath = (userId) => path.join(__dirname, `formData_${userId}.json`);
const chatTranscriptPath = (userId) => path.join(__dirname, `chatTranscript_${userId}.json`);
const userInputPath = (userId) => path.join(__dirname, `user-input_${userId}.txt`);

// console.log("Chat transcript path: " + chatTranscriptPath("test123"))

let clients = [];
let watcher = null;

app.get('/events/:userId/:sessionId', async (req, res) => {
  const userId = req.params.userId;
  const sessionId = req.params.sessionId
  console.log("RUNNING: Events/:"+userId+"/:"+sessionId)
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

  console.log("Get initial data")
  try {
    const [formData, chatTranscript, userInput] = await Promise.all([
      readFileJSON(dataFilePath(userId)),
      readFileJSON(chatTranscriptPath(userId)),
      readFileText(userInputPath(userId))
    ]);
    // console.log("Chat transcript: " + chatTranscript)
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

async function sendUpdatesX(userId, sessionId) {
  console.log("Sending Updates")
  try {
    const [formData, chatTranscript, userInput] = await Promise.all([
      readFileJSON(dataFilePath(userId)),
      readFileJSON(chatTranscriptPath(userId)),
      readFileText(userInputPath(userId))
    ]);
    sendEventsToAll(userId, { formData, chatTranscript, userInput });
  } catch (error) {
    console.error('Error reading files:', error);
  }
}


app.post('/initializeX/:userId/:sessionId', async (req, res) => {
  console.log("Initialize")
  const userId = req.params.userId;
  const sessionId = req.params.sessionId; //req.params.sessionId TBD
  var  sessionIdReturned = null;

  const { dataFilePath, chatTranscriptPath, userInputPath } = {
    dataFilePath: path.join(__dirname, `formData_${userId}.json`),
    chatTranscriptPath: path.join(__dirname, `chatTranscript_${userId}.json`),
    userInputPath: path.join(__dirname, `user-input_${userId}.txt`)
  }

  // Close existing watcher if it exists
  if (watcher) {
    console.log("closing watcher")
    watcher.close();
  }

  console.log("setting up file watcher")

  // Set up new watcher for this user's files
  console.log("WATCHING: " + chatTranscriptPath)
  watcher = chokidar.watch([dataFilePath, chatTranscriptPath, userInputPath], {
    usePolling: true,
    interval: 500
  });

  watcher.on('change', (path) => {
    sendUpdates(userId, sessionId);
  });


  console.log("initializing user " + userId + " with session " + sessionId)

  try {
    const { stdout, stderr } = await execPromise(`python3 ../getSessionId.py ${userId} ${sessionId}`);
    console.log("user initialized in DB")
    sessionIdReturned = stdout.trim();
  } catch (error) {
    console.error(`exec error in initialization: ${error}`);
    return res.status(500).send('Error running reset script');
  }

  console.log("Sending initial update")
  sendUpdates(userId, sessionId)

  console.log("end initialization")
  console.log(`Session ID returned to server.js: ${sessionIdReturned}`)
  res.status(200).send(`${sessionIdReturned}`);
})



// Create a map to store watchers for different users
const userWatchers = new Map();

app.post('/initialize/:userId/:sessionId', async (req, res) => {
  console.log("Initialize");
  const userId = req.params.userId;
  const sessionId = req.params.sessionId;
  let sessionIdReturned = null;

  const filePaths = {
    dataFilePath: path.join(__dirname, `formData_${userId}.json`),
    chatTranscriptPath: path.join(__dirname, `chatTranscript_${userId}.json`),
    userInputPath: path.join(__dirname, `user-input_${userId}.txt`)
  };

  // Close existing watcher for this user if it exists
  if (userWatchers.has(userId)) {
    console.log(`Closing watcher for user ${userId}`);
    userWatchers.get(userId).close();
    userWatchers.delete(userId);
  }

  console.log(`Setting up file watcher for user ${userId}`);
  console.log("WATCHING:", [filePaths.dataFilePath, filePaths.chatTranscriptPath, filePaths.userInputPath]);

  // Set up new watcher for this user's files with more verbose options
  const watcher = chokidar.watch([
    filePaths.dataFilePath,
    filePaths.chatTranscriptPath,
    filePaths.userInputPath
  ], {
    persistent: true,
    usePolling: true,
    interval: 100, // Poll more frequently
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100
    },
    ignoreInitial: false
  });

  // Add debug logging for watcher events
  watcher
    .on('add', path => console.log(`File ${path} has been added`))
    .on('change', async (path) => {
      console.log(`File ${path} has been changed`);
      await sendUpdates(userId, sessionId);
    })
    .on('unlink', path => console.log(`File ${path} has been removed`))
    .on('error', error => console.error(`Watcher error: ${error}`));

  // Store the watcher reference for this user
  userWatchers.set(userId, watcher);

  try {
    const { stdout, stderr } = await execPromise(`python3 ../getSessionId.py ${userId} ${sessionId}`);
    console.log("User initialized in DB");
    sessionIdReturned = stdout.trim();
  } catch (error) {
    console.error(`Exec error in initialization: ${error}`);
    return res.status(500).send('Error running reset script');
  }

  // Ensure initial update is sent
  await sendUpdates(userId, sessionId);

  console.log("End initialization");
  console.log(`Session ID returned to server.js: ${sessionIdReturned}`);
  res.status(200).send(`${sessionIdReturned}`);
});

// Update the sendUpdates function to include error handling and logging
async function sendUpdates(userId, sessionId) {
  console.log(`Sending updates for user ${userId}`);
  try {
    const [formData, chatTranscript, userInput] = await Promise.all([
      readFileJSON(dataFilePath(userId)),
      readFileJSON(chatTranscriptPath(userId)),
      readFileText(userInputPath(userId))
    ]);
    
    console.log('Read updated files successfully');
    console.log('Broadcasting to clients:', { 
      hasFormData: !!formData, 
      hasChatTranscript: !!chatTranscript, 
      hasUserInput: !!userInput 
    });
    
    sendEventsToAll(userId, { formData, chatTranscript, userInput });
  } catch (error) {
    console.error('Error in sendUpdates:', error);
  }
}


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

app.post('/auto-chat/:userId/:sessionId', (req, res) => {

  const userId = req.params.userId;
  const sessionId = userId; // req.params.sessionId

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

app.post('/runChatBot/:userId', async (req, res) => {

  console.log("RUNNING CHATBOT")

  const userId = req.params.userId;
  const sessionId = "THIS_IS_NOT_USED"
  const userInput = req.body.userInput
  
  console.log(userInput)

  const command = `python3 ../chatBotHandler.py ${userId} ${sessionId} "${userInput}" &`;
  // const command = "echo hello"

  console.log('Run chatbot Executing command:', command); // Debug output

  console.log("run command")
  

  await exec(command, { detached: true }, (error, stdout, stderr) => {
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
  console.log("/reset/:"+userId)
  
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

app.get('/test', (req, res) =>{
  res.setHeader('Content-Type', 'text/html');
  res.send("<center><b>root test</b></center>");
})


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});