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


// maps store watchers and connections for different users
const userWatchers = new Map();
const userConnections = new Map();


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


async function setupFileWatcher(userId, sessionId) {

  const filesToWatch = [
    dataFilePath(userId),
    chatTranscriptPath(userId),
    userInputPath(userId)
  ];

  console.log('Setting up watcher for files:', filesToWatch);

  // Create empty files if they don't exist
  for (const file of filesToWatch) {
    try {
      await fs.access(file, fs.constants.F_OK);
    } catch (error) {
      // File doesn't exist, create it
      console.log(`Creating empty file: ${file}`);
      try {
        // Create empty JSON files for data and transcript
        if (file.includes('chatTranscript')) {
          const blankData = await fs.readFile(path.join(__dirname, '../storage/chatTranscript_blank.json'), 'utf8');
          await fs.writeFile(file, blankData);
        } else if(file.includes('formData')) {
          const blankData = await fs.readFile(path.join(__dirname, '../storage/formData_blank.json'), 'utf8');

          await fs.writeFile(file, blankData);
        } else {
          // Create empty text file for user input
          // NOT DONE
        }
      } catch (error) {
        console.error(`Error creating file ${file}:`, error);
      }
    }
  }

  const watcher = chokidar.watch([
    dataFilePath(userId),
    chatTranscriptPath(userId),
    userInputPath(userId)
  ], {
    persistent: true,
    usePolling: true,
    interval: 100,
    ignoreInitial: false
  });

  watcher.on('ready', () => {
    console.log(`Watcher ready for user ${userId}`);
  });


  watcher.on('change', async (path) => {
    console.log(`File changed: ${path}`);
    await sendUpdates(userId, sessionId);
  });

  watcher.on('error', error => {
    console.error(`Watcher error for user ${userId}:`, error);
  });

  userWatchers.set(userId, watcher);
}

app.get('/events/:userId/:sessionId', async (req, res) => {
  const userId = req.params.userId;
  const sessionId = req.params.sessionId
  console.log("RUNNING: Events/:"+userId+"/:"+sessionId)
  console.log(`New SSE connection for user ${userId}`);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  
  // initialize connections and watchers

  // Track the connection
  if (!userConnections.has(userId)) {
    console.log(`Creating new connection list for user ${userId}`);
    userConnections.set(userId, []);
  }
  userConnections.get(userId).push(newClient);

  // Clean up on connection close
  req.on('close', () => {
    console.log(`SSE connection closed for user ${userId}, client ${clientId}`);
    const userClients = userConnections.get(userId) || [];
    userConnections.set(userId, userClients.filter(client => client.id !== clientId));
    
    // If this was the last connection for this user, clean up their watcher
    if (userConnections.get(userId).length === 0) {
      console.log(`No more connections for user ${userId}, cleaning up watcher`);
      if (userWatchers.has(userId)) {
        const watcher = userWatchers.get(userId);
        if (watcher) {
          try {
            watcher.close();
            console.log(`Watcher closed for user ${userId}`);
          } catch (error) {
            console.error(`Error closing watcher for user ${userId}:`, error);
          }
        }
        userWatchers.delete(userId);
      }
    }
  });

  // Set up watcher if not exists
  if (!userWatchers.has(userId)) {
    await setupFileWatcher(userId, sessionId);
    userWatchers.set(userId, watcher);
  }
  

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
    // console.log("Chat transcript: " + JSON.stringify(chatTranscript))
    return { formData, chatTranscript: chatTranscript.messages, userInput };
  } catch (error) {
    console.error('Error reading initial data:', error);
    return { formData: null, chatTranscript: null, userInput: '' };
  }
}

function sendEventsToAll(userId, data) {
  const userClients = userConnections.get(userId) || [];
  console.log(`Sending updates to ${userClients.length} clients for user ${userId}`);
  console.log("Sending: " + data)
  userClients.forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error(`Error sending to client ${client.id}:`, error);
    }
  });
}

async function readFileJSON(filepath) {
  console.log("Reading file: " + filepath)
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


app.post('/initialize/:userId/:sessionId', async (req, res) => {
  console.log("Initialize");
  const userId = req.params.userId;
  const sessionId = req.params.sessionId;
  let sessionIdReturned = null;

  try {
    const { stdout, stderr } = await execPromise(`python3 ../getSessionId.py ${userId} ${sessionId}`);
    console.log("User initialized in DB");
    sessionIdReturned = stdout.trim();
    res.status(200).send(`${sessionIdReturned}`);
  } catch (error) {
    console.error(`Exec error in initialization: ${error}`);
    return res.status(500).send('Error running reset script');
  }

  console.log("End initialization");
  console.log(`Session ID returned to server.js: ${sessionIdReturned}`);
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
    
    // console.log('Read updated files successfully');
    // console.log("Sending update CT: " + JSON.stringify(chatTranscript))
    // console.log("Broadcasting to: " + userId)
    
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

// Cleanup on server shutdown
process.on('SIGINT', () => {
  console.log('Cleaning up...');
  for (const [userId, watcher] of userWatchers) {
    console.log(`Closing watcher for user ${userId}`);
    watcher.close();
  }
  userWatchers.clear();
  userConnections.clear();
  process.exit(0);
});