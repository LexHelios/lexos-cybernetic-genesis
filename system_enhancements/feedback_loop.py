FEEDBACK_DB = []

def submit_feedback(agent_id, user_id, feedback, rating):
    FEEDBACK_DB.append({
        "agent_id": agent_id,
        "user_id": user_id,
        "feedback": feedback,
        "rating": rating
    })
    # TODO: Integrate feedback into agent/model improvement
    return True

def get_feedback(agent_id=None):
    if agent_id:
        return [f for f in FEEDBACK_DB if f["agent_id"] == agent_id]
    return FEEDBACK_DB 