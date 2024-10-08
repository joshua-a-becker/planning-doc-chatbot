import sys
from askGpt import *
from db_handler import db

print("startup notetaking script")

user_id = sys.argv[1]

print("User: " + user_id)


def main():
    print("running notetaking script")

    # get session id
    session_id = db.get_session_id_for_user(user_id)

    ### load chat history
    chat_history = db.get_chat_history(session_id)

    ### load current notes data
    data_state = db.get_data_state(session_id)

    # Prepare data_state prompt
    with open('prompts/datastate_extractor_prompt_template.txt', 'r') as file:
        datastate_prompt_template  = file.read()

    datastate_prompt = datastate_prompt_template \
        .replace("{current_data_state}", json.dumps(data_state)) \
        .replace("{conversation_thread}", json.dumps(chat_history))

    with open("storage/last_datastate_prompt.txt", "w") as f:
        f.write(datastate_prompt)

    # run data state prompt
    data_state = ask_gpt_data(datastate_prompt)
    
    # Write the updated state back to the file
    with open("storage/data_state.txt", "w") as f:
        json.dump(data_state, f, indent=2)

    print("end data state update")

if __name__ == "__main__":
    main()
