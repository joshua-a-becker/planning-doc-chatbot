import os
# os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")
os.chdir("/root/planning-doc-chatbot")

import json

blank_data_state = {
                "expansive_topics" : { }, 
                "narrow_topics": []
            }

### load blank
with open('chatTranscript_blank.json', 'r') as file:
    chat_history = json.load(file)['messages']

with open('formData_blank.json', 'r') as file:
    form_data = json.load(file)


# save blank chat history to file
f = open("ux/chatTranscript.json", "w")
f.write(json.dumps({"messages": chat_history}))
f.close()

# save blank datastate
# save blank chat history to file
f = open("data_state.txt", "w")
f.write(json.dumps(blank_data_state))
f.close()

# save blank form data to file
f = open("ux/formData.json", "w")
f.write(json.dumps(form_data))
f.close()

# reset prompt file to step_one_intro_discovery
f = open("instructionsPromptFile.txt", "w")
f.write("step_one_intro_discovery")
f.close()

# clear user input
f = open("ux/user-input.txt", "w")
f.write(" ")
f.close()
