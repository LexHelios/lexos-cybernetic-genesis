class ModelRegistry:
    def __init__(self):
        self.models = {}

    def register_model(self, name, version, path):
        self.models[name] = {"version": version, "path": path}

    def get_model(self, name):
        return self.models.get(name)

    def update_model(self, name, version, path):
        self.models[name] = {"version": version, "path": path}

    def rollback_model(self, name, previous_version):
        # TODO: Implement rollback logic
        pass 