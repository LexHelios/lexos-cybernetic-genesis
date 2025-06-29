export interface ModelCatalogEntry {
  name: string;
  displayName: string;
  description: string;
  category: 'language' | 'code' | 'embedding' | 'vision' | 'specialized';
  sizes: string[];
  defaultSize?: string;
  capabilities: string[];
  requirements: {
    minVRAM: string;
    recommendedVRAM: string;
  };
  tags: string[];
  releaseDate?: string;
  organization: string;
  license: string;
}

export const modelCatalog: ModelCatalogEntry[] = [
  // Language Models
  {
    name: 'llama3.2',
    displayName: 'Llama 3.2',
    description: 'Meta\'s latest and most capable language model with improved reasoning and instruction following',
    category: 'language',
    sizes: ['1b', '3b'],
    defaultSize: '3b',
    capabilities: ['text-generation', 'conversation', 'reasoning', 'instruction-following'],
    requirements: {
      minVRAM: '2GB',
      recommendedVRAM: '4GB'
    },
    tags: ['latest', 'meta', 'general-purpose'],
    releaseDate: '2024-09',
    organization: 'Meta',
    license: 'Llama 3.2 License'
  },
  {
    name: 'llama3.1',
    displayName: 'Llama 3.1',
    description: 'Meta\'s powerful open-source language model with strong performance across tasks',
    category: 'language',
    sizes: ['8b', '70b', '405b'],
    defaultSize: '8b',
    capabilities: ['text-generation', 'conversation', 'reasoning', 'multilingual'],
    requirements: {
      minVRAM: '6GB',
      recommendedVRAM: '16GB'
    },
    tags: ['meta', 'powerful', 'multilingual'],
    releaseDate: '2024-07',
    organization: 'Meta',
    license: 'Llama 3.1 License'
  },
  {
    name: 'mistral',
    displayName: 'Mistral 7B',
    description: 'Efficient and powerful 7B parameter model with excellent performance',
    category: 'language',
    sizes: ['7b'],
    capabilities: ['text-generation', 'conversation', 'efficiency'],
    requirements: {
      minVRAM: '4GB',
      recommendedVRAM: '8GB'
    },
    tags: ['efficient', 'french', 'popular'],
    releaseDate: '2023-09',
    organization: 'Mistral AI',
    license: 'Apache 2.0'
  },
  {
    name: 'mixtral',
    displayName: 'Mixtral 8x7B',
    description: 'Mixture of experts model with 8x7B parameters for superior performance',
    category: 'language',
    sizes: ['8x7b', '8x22b'],
    defaultSize: '8x7b',
    capabilities: ['text-generation', 'conversation', 'reasoning', 'moe'],
    requirements: {
      minVRAM: '24GB',
      recommendedVRAM: '48GB'
    },
    tags: ['moe', 'powerful', 'mistral'],
    releaseDate: '2023-12',
    organization: 'Mistral AI',
    license: 'Apache 2.0'
  },
  {
    name: 'gemma2',
    displayName: 'Gemma 2',
    description: 'Google\'s lightweight and efficient language model',
    category: 'language',
    sizes: ['2b', '9b', '27b'],
    defaultSize: '9b',
    capabilities: ['text-generation', 'conversation', 'efficiency'],
    requirements: {
      minVRAM: '2GB',
      recommendedVRAM: '8GB'
    },
    tags: ['google', 'efficient', 'lightweight'],
    releaseDate: '2024-06',
    organization: 'Google',
    license: 'Gemma License'
  },
  {
    name: 'phi3',
    displayName: 'Phi-3',
    description: 'Microsoft\'s small language model with impressive capabilities',
    category: 'language',
    sizes: ['3.8b', '14b'],
    defaultSize: '3.8b',
    capabilities: ['text-generation', 'conversation', 'reasoning'],
    requirements: {
      minVRAM: '2GB',
      recommendedVRAM: '4GB'
    },
    tags: ['microsoft', 'small', 'efficient'],
    releaseDate: '2024-04',
    organization: 'Microsoft',
    license: 'MIT'
  },
  {
    name: 'qwen2.5',
    displayName: 'Qwen 2.5',
    description: 'Alibaba\'s multilingual model with strong performance in multiple languages',
    category: 'language',
    sizes: ['0.5b', '1.5b', '3b', '7b', '14b', '32b', '72b'],
    defaultSize: '7b',
    capabilities: ['text-generation', 'conversation', 'multilingual', 'chinese'],
    requirements: {
      minVRAM: '1GB',
      recommendedVRAM: '8GB'
    },
    tags: ['alibaba', 'multilingual', 'chinese'],
    releaseDate: '2024-09',
    organization: 'Alibaba',
    license: 'Qwen License'
  },
  
  // Code Models
  {
    name: 'codellama',
    displayName: 'Code Llama',
    description: 'Meta\'s specialized model for code generation and understanding',
    category: 'code',
    sizes: ['7b', '13b', '34b', '70b'],
    defaultSize: '7b',
    capabilities: ['code-generation', 'code-completion', 'debugging', 'explanation'],
    requirements: {
      minVRAM: '4GB',
      recommendedVRAM: '16GB'
    },
    tags: ['meta', 'coding', 'popular'],
    releaseDate: '2023-08',
    organization: 'Meta',
    license: 'Llama License'
  },
  {
    name: 'deepseek-coder-v2',
    displayName: 'DeepSeek Coder V2',
    description: 'Advanced coding model with support for 300+ programming languages',
    category: 'code',
    sizes: ['16b', '236b'],
    defaultSize: '16b',
    capabilities: ['code-generation', 'code-completion', 'multi-language', 'reasoning'],
    requirements: {
      minVRAM: '8GB',
      recommendedVRAM: '32GB'
    },
    tags: ['deepseek', 'coding', 'multilingual'],
    releaseDate: '2024-06',
    organization: 'DeepSeek',
    license: 'DeepSeek License'
  },
  {
    name: 'codegemma',
    displayName: 'CodeGemma',
    description: 'Google\'s code-focused model based on Gemma',
    category: 'code',
    sizes: ['2b', '7b'],
    defaultSize: '7b',
    capabilities: ['code-generation', 'code-completion', 'fill-in-the-middle'],
    requirements: {
      minVRAM: '2GB',
      recommendedVRAM: '8GB'
    },
    tags: ['google', 'coding', 'efficient'],
    releaseDate: '2024-04',
    organization: 'Google',
    license: 'Gemma License'
  },
  {
    name: 'starcoder2',
    displayName: 'StarCoder 2',
    description: 'Open-source code model trained on 600+ programming languages',
    category: 'code',
    sizes: ['3b', '7b', '15b'],
    defaultSize: '7b',
    capabilities: ['code-generation', 'code-completion', 'multi-language'],
    requirements: {
      minVRAM: '2GB',
      recommendedVRAM: '8GB'
    },
    tags: ['bigcode', 'coding', 'open-source'],
    releaseDate: '2024-02',
    organization: 'BigCode',
    license: 'BigCode License'
  },
  {
    name: 'qwen2.5-coder',
    displayName: 'Qwen 2.5 Coder',
    description: 'Alibaba\'s specialized coding model with strong performance',
    category: 'code',
    sizes: ['1.5b', '7b', '14b', '32b'],
    defaultSize: '7b',
    capabilities: ['code-generation', 'code-completion', 'debugging'],
    requirements: {
      minVRAM: '2GB',
      recommendedVRAM: '8GB'
    },
    tags: ['alibaba', 'coding', 'efficient'],
    releaseDate: '2024-11',
    organization: 'Alibaba',
    license: 'Apache 2.0'
  },
  
  // Vision Models
  {
    name: 'llava',
    displayName: 'LLaVA',
    description: 'Visual language model for image understanding and conversation',
    category: 'vision',
    sizes: ['7b', '13b', '34b'],
    defaultSize: '7b',
    capabilities: ['image-understanding', 'visual-qa', 'image-description'],
    requirements: {
      minVRAM: '6GB',
      recommendedVRAM: '16GB'
    },
    tags: ['vision', 'multimodal', 'popular'],
    releaseDate: '2023-10',
    organization: 'LLaVA Team',
    license: 'Apache 2.0'
  },
  {
    name: 'llama3.2-vision',
    displayName: 'Llama 3.2 Vision',
    description: 'Meta\'s multimodal model with vision capabilities',
    category: 'vision',
    sizes: ['11b', '90b'],
    defaultSize: '11b',
    capabilities: ['image-understanding', 'visual-reasoning', 'image-text'],
    requirements: {
      minVRAM: '8GB',
      recommendedVRAM: '24GB'
    },
    tags: ['meta', 'vision', 'latest'],
    releaseDate: '2024-09',
    organization: 'Meta',
    license: 'Llama 3.2 License'
  },
  {
    name: 'minicpm-v',
    displayName: 'MiniCPM-V',
    description: 'Efficient multimodal model for vision and language tasks',
    category: 'vision',
    sizes: ['8b'],
    capabilities: ['image-understanding', 'ocr', 'visual-qa'],
    requirements: {
      minVRAM: '6GB',
      recommendedVRAM: '12GB'
    },
    tags: ['efficient', 'vision', 'multimodal'],
    releaseDate: '2024-08',
    organization: 'OpenBMB',
    license: 'Apache 2.0'
  },
  
  // Embedding Models
  {
    name: 'nomic-embed-text',
    displayName: 'Nomic Embed Text',
    description: 'High-performance text embedding model',
    category: 'embedding',
    sizes: ['v1.5'],
    capabilities: ['text-embedding', 'semantic-search', 'clustering'],
    requirements: {
      minVRAM: '1GB',
      recommendedVRAM: '2GB'
    },
    tags: ['embedding', 'search', 'efficient'],
    releaseDate: '2024-02',
    organization: 'Nomic AI',
    license: 'Apache 2.0'
  },
  {
    name: 'mxbai-embed-large',
    displayName: 'MixedBread Embed Large',
    description: 'State-of-the-art embedding model for semantic search',
    category: 'embedding',
    sizes: ['v1'],
    capabilities: ['text-embedding', 'semantic-search', 'retrieval'],
    requirements: {
      minVRAM: '1GB',
      recommendedVRAM: '2GB'
    },
    tags: ['embedding', 'search', 'sota'],
    releaseDate: '2024-03',
    organization: 'MixedBread',
    license: 'Apache 2.0'
  },
  {
    name: 'all-minilm',
    displayName: 'All-MiniLM',
    description: 'Lightweight and fast sentence embedding model',
    category: 'embedding',
    sizes: ['l6-v2'],
    capabilities: ['text-embedding', 'sentence-similarity'],
    requirements: {
      minVRAM: '512MB',
      recommendedVRAM: '1GB'
    },
    tags: ['embedding', 'lightweight', 'fast'],
    releaseDate: '2021-08',
    organization: 'Microsoft',
    license: 'Apache 2.0'
  },
  
  // Specialized Models
  {
    name: 'dolphin-mixtral',
    displayName: 'Dolphin Mixtral',
    description: 'Uncensored and helpful assistant based on Mixtral',
    category: 'specialized',
    sizes: ['8x7b', '8x22b'],
    defaultSize: '8x7b',
    capabilities: ['conversation', 'reasoning', 'uncensored'],
    requirements: {
      minVRAM: '24GB',
      recommendedVRAM: '48GB'
    },
    tags: ['dolphin', 'uncensored', 'assistant'],
    releaseDate: '2024-01',
    organization: 'Eric Hartford',
    license: 'Apache 2.0'
  },
  {
    name: 'solar-pro',
    displayName: 'SOLAR Pro',
    description: 'Advanced model optimized for complex reasoning tasks',
    category: 'specialized',
    sizes: ['22b'],
    capabilities: ['reasoning', 'analysis', 'problem-solving'],
    requirements: {
      minVRAM: '16GB',
      recommendedVRAM: '32GB'
    },
    tags: ['solar', 'reasoning', 'advanced'],
    releaseDate: '2024-08',
    organization: 'Upstage',
    license: 'Apache 2.0'
  },
  {
    name: 'hermes-3',
    displayName: 'Hermes 3',
    description: 'Advanced conversational model with tool use capabilities',
    category: 'specialized',
    sizes: ['8b', '70b', '405b'],
    defaultSize: '8b',
    capabilities: ['conversation', 'tool-use', 'function-calling'],
    requirements: {
      minVRAM: '6GB',
      recommendedVRAM: '16GB'
    },
    tags: ['hermes', 'tools', 'advanced'],
    releaseDate: '2024-08',
    organization: 'NousResearch',
    license: 'Apache 2.0'
  }
];

// Helper function to get models by category
export function getModelsByCategory(category: ModelCatalogEntry['category']): ModelCatalogEntry[] {
  return modelCatalog.filter(model => model.category === category);
}

// Helper function to search models
export function searchModels(query: string): ModelCatalogEntry[] {
  const lowerQuery = query.toLowerCase();
  return modelCatalog.filter(model => 
    model.name.toLowerCase().includes(lowerQuery) ||
    model.displayName.toLowerCase().includes(lowerQuery) ||
    model.description.toLowerCase().includes(lowerQuery) ||
    model.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    model.organization.toLowerCase().includes(lowerQuery)
  );
}

// Helper function to get model by name
export function getModelByName(name: string): ModelCatalogEntry | undefined {
  return modelCatalog.find(model => model.name === name);
}