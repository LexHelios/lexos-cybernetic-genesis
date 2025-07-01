import importlib

class PluginLoader:
    def __init__(self):
        self.plugins = {}

    def load_plugin(self, name, path):
        # TODO: Dynamically load plugin/skill
        module = importlib.import_module(path)
        self.plugins[name] = module
        return module

    def unload_plugin(self, name):
        # TODO: Unload plugin/skill
        if name in self.plugins:
            del self.plugins[name]

    def get_plugin(self, name):
        return self.plugins.get(name) 