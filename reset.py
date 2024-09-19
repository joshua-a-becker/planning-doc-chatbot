import os
os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")
# os.chdir("/root/planning-doc-chatbot")

import json





### load blank
with open('storage/chatTranscript_blank.json', 'r') as file:
    chat_history = json.load(file)['messages']

with open('storage/formData_blank.json', 'r') as file:
    form_data = json.load(file)

with open('storage/data_state_blank.txt', 'r') as file:
    blank_data_state = json.load(file)

# save blank chat history to file
f = open("ux/chatTranscript.json", "w")
f.write(json.dumps({"messages": chat_history}))
f.close()

# save blank datastate
# save blank chat history to file
f = open("storage/data_state.txt", "w")
f.write(json.dumps(blank_data_state))
f.close()

# save blank form data to file
f = open("ux/formData.json", "w")
f.write(json.dumps(form_data))
f.close()

# reset prompt file to step_one_intro_discovery
f = open("storage/instructionsPromptFile.txt", "w")
f.write("step_one_intro_discovery")
f.close()

# clear user input
f = open("ux/user-input.txt", "w")
f.write(" ")
f.close()

# empty content history
f = open("storage/content_history.txt", "w")
f.write("")
f.close()

# store and reset thread id
with open("storage/thread_id.txt", "r") as f, open("storage/thread_id_history.txt", "a") as history: 
    history.write(f.read().strip() + "\n") if os.path.exists("storage/thread_id.txt") else None

os.remove("storage/thread_id.txt") if os.path.exists("storage/thread_id.txt") else None