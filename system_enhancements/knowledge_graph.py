import networkx as nx
from typing import Any, List

class KnowledgeGraph:
    def __init__(self):
        self.graph = nx.MultiDiGraph()

    def add_entity(self, entity_id, **attrs):
        self.graph.add_node(entity_id, **attrs)

    def add_relationship(self, src, dst, rel_type, **attrs):
        self.graph.add_edge(src, dst, key=rel_type, **attrs)

    def get_entity(self, entity_id):
        return self.graph.nodes.get(entity_id, {})

    def find_related(self, entity_id, rel_type=None):
        # TODO: Filter by rel_type if needed
        return list(self.graph.neighbors(entity_id))

# Semantic search stub
from sentence_transformers import SentenceTransformer, util
import numpy as np

class SemanticMemorySearch:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)
        self.memory = []  # List of (text, embedding)

    def add_memory(self, text):
        emb = self.model.encode(text)
        self.memory.append((text, emb))

    def search(self, query, top_k=5):
        query_emb = self.model.encode(query)
        scores = [util.pytorch_cos_sim(query_emb, emb)[0][0].item() for _, emb in self.memory]
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [self.memory[i][0] for i in top_indices] 