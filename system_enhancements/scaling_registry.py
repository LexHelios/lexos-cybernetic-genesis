class AgentRegistry:
    def __init__(self):
        self.agents = {}

    def register_agent(self, agent_id, info):
        self.agents[agent_id] = info

    def get_agent(self, agent_id):
        return self.agents.get(agent_id)

    def list_agents(self):
        return list(self.agents.keys())

    def load_balance(self, task):
        # TODO: Implement load balancing logic
        if self.agents:
            # Simple round-robin or random selection
            return next(iter(self.agents))
        return None 