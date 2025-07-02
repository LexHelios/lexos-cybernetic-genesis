import axios from 'axios';
import { config } from 'dotenv';
import grokService from './grokService.js';

config();

class FigmaService {
  constructor() {
    this.apiKey = process.env.FIGMA_API_KEY;
    this.baseURL = 'https://api.figma.com/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-Figma-Token': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
    this.initialize();
  }

  initialize() {
    if (this.apiKey) {
      console.log('Figma service initialized');
    } else {
      console.log('Figma API key not configured');
    }
  }

  // Get file information
  async getFile(fileKey, options = {}) {
    if (!this.apiKey) {
      throw new Error('Figma API key not configured');
    }

    try {
      const params = new URLSearchParams();
      if (options.version) params.append('version', options.version);
      if (options.ids) params.append('ids', options.ids);
      if (options.depth) params.append('depth', options.depth.toString());
      if (options.geometry) params.append('geometry', options.geometry);
      if (options.plugin_data) params.append('plugin_data', options.plugin_data);
      if (options.branch_data) params.append('branch_data', options.branch_data.toString());

      const response = await this.client.get(`/files/${fileKey}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Figma API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get file nodes
  async getFileNodes(fileKey, nodeIds, options = {}) {
    if (!this.apiKey) {
      throw new Error('Figma API key not configured');
    }

    try {
      const params = new URLSearchParams();
      params.append('ids', Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds);
      if (options.version) params.append('version', options.version);
      if (options.depth) params.append('depth', options.depth.toString());
      if (options.geometry) params.append('geometry', options.geometry);
      if (options.plugin_data) params.append('plugin_data', options.plugin_data);

      const response = await this.client.get(`/files/${fileKey}/nodes?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Figma API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get image exports
  async getImages(fileKey, options = {}) {
    if (!this.apiKey) {
      throw new Error('Figma API key not configured');
    }

    try {
      const params = new URLSearchParams();
      if (options.ids) params.append('ids', options.ids);
      if (options.scale) params.append('scale', options.scale.toString());
      if (options.format) params.append('format', options.format);
      if (options.svg_include_id) params.append('svg_include_id', options.svg_include_id.toString());
      if (options.svg_simplify_stroke) params.append('svg_simplify_stroke', options.svg_simplify_stroke.toString());
      if (options.use_absolute_bounds) params.append('use_absolute_bounds', options.use_absolute_bounds.toString());
      if (options.version) params.append('version', options.version);

      const response = await this.client.get(`/images/${fileKey}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Figma API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get team projects
  async getTeamProjects(teamId) {
    if (!this.apiKey) {
      throw new Error('Figma API key not configured');
    }

    try {
      const response = await this.client.get(`/teams/${teamId}/projects`);
      return response.data;
    } catch (error) {
      console.error('Figma API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get project files
  async getProjectFiles(projectId, options = {}) {
    if (!this.apiKey) {
      throw new Error('Figma API key not configured');
    }

    try {
      const params = new URLSearchParams();
      if (options.branch_data) params.append('branch_data', options.branch_data.toString());

      const response = await this.client.get(`/projects/${projectId}/files?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Figma API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get file components
  async getFileComponents(fileKey) {
    if (!this.apiKey) {
      throw new Error('Figma API key not configured');
    }

    try {
      const response = await this.client.get(`/files/${fileKey}/components`);
      return response.data;
    } catch (error) {
      console.error('Figma API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get file component sets
  async getFileComponentSets(fileKey) {
    if (!this.apiKey) {
      throw new Error('Figma API key not configured');
    }

    try {
      const response = await this.client.get(`/files/${fileKey}/component_sets`);
      return response.data;
    } catch (error) {
      console.error('Figma API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get file styles
  async getFileStyles(fileKey) {
    if (!this.apiKey) {
      throw new Error('Figma API key not configured');
    }

    try {
      const response = await this.client.get(`/files/${fileKey}/styles`);
      return response.data;
    } catch (error) {
      console.error('Figma API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // AI-powered design analysis using Grok
  async analyzeDesignWithAI(fileKey, nodeIds = null, analysisType = 'general') {
    try {
      // Get the design file data
      const fileData = await this.getFile(fileKey);
      
      // Get high-quality images of the design
      const imageParams = {
        format: 'png',
        scale: 2,
        use_absolute_bounds: true
      };
      
      if (nodeIds) {
        imageParams.ids = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
      }
      
      const images = await this.getImages(fileKey, imageParams);
      
      if (!images.images || Object.keys(images.images).length === 0) {
        throw new Error('No images could be generated from the Figma file');
      }

      // Get the first available image URL
      const imageUrls = Object.values(images.images).filter(url => url);
      
      if (imageUrls.length === 0) {
        throw new Error('Failed to generate image URLs from Figma');
      }

      // Analyze with Grok's vision capabilities
      let analysisPrompt = '';
      switch (analysisType) {
        case 'ui-review':
          analysisPrompt = `Analyze this UI design from Figma. Provide detailed feedback on:
1. Design principles and visual hierarchy
2. User experience and usability
3. Accessibility considerations
4. Color scheme and typography
5. Layout and spacing
6. Component consistency
7. Mobile responsiveness considerations
8. Suggestions for improvement
9. Implementation complexity assessment`;
          break;
        
        case 'code-generation':
          analysisPrompt = `Analyze this Figma design and generate corresponding code. Provide:
1. HTML structure that matches the layout
2. CSS/SCSS styles for the design
3. React/Vue components if applicable
4. Responsive design considerations
5. Interactive elements and animations
6. Component architecture recommendations
7. Accessibility attributes
8. Performance optimization suggestions`;
          break;
        
        case 'design-system':
          analysisPrompt = `Analyze this Figma design for design system consistency. Evaluate:
1. Component reusability and modularity
2. Color palette consistency
3. Typography scale and hierarchy
4. Spacing and layout patterns
5. Icon usage and style
6. Button and form element consistency
7. Design token recommendations
8. Component library structure suggestions`;
          break;
        
        case 'handoff':
          analysisPrompt = `Analyze this Figma design for developer handoff. Provide:
1. Detailed specifications for developers
2. Asset export requirements
3. Animation and interaction specifications
4. Responsive breakpoint requirements
5. Component states and variants
6. Implementation priority recommendations
7. Potential technical challenges
8. QA testing considerations`;
          break;
        
        default:
          analysisPrompt = `Analyze this Figma design comprehensively. Provide insights on design quality, usability, implementation feasibility, and improvement suggestions.`;
      }

      const aiAnalysis = await grokService.analyzeImageWithText(imageUrls[0], analysisPrompt);
      
      return {
        success: true,
        fileInfo: {
          name: fileData.name,
          lastModified: fileData.lastModified,
          version: fileData.version
        },
        analysisType,
        imageUrls,
        aiAnalysis: aiAnalysis.content,
        metadata: {
          model: aiAnalysis.model,
          usage: aiAnalysis.usage
        }
      };

    } catch (error) {
      console.error('Design analysis error:', error);
      throw error;
    }
  }

  // Generate code from Figma design
  async generateCodeFromDesign(fileKey, nodeIds = null, codeType = 'react') {
    return await this.analyzeDesignWithAI(fileKey, nodeIds, 'code-generation');
  }

  // Review design for UX/UI best practices
  async reviewDesignUX(fileKey, nodeIds = null) {
    return await this.analyzeDesignWithAI(fileKey, nodeIds, 'ui-review');
  }

  // Analyze design system consistency
  async analyzeDesignSystem(fileKey, nodeIds = null) {
    return await this.analyzeDesignWithAI(fileKey, nodeIds, 'design-system');
  }

  // Prepare design for developer handoff
  async prepareHandoff(fileKey, nodeIds = null) {
    return await this.analyzeDesignWithAI(fileKey, nodeIds, 'handoff');
  }

  // Extract design tokens
  async extractDesignTokens(fileKey) {
    try {
      const fileData = await this.getFile(fileKey);
      const styles = await this.getFileStyles(fileKey);
      
      const tokens = {
        colors: {},
        typography: {},
        spacing: {},
        effects: {},
        components: {}
      };

      // Process styles to extract design tokens
      if (styles.meta && styles.meta.styles) {
        for (const style of styles.meta.styles) {
          if (style.style_type === 'FILL') {
            tokens.colors[style.name] = {
              id: style.node_id,
              description: style.description || '',
              // Note: Actual color values would need to be extracted from the file data
            };
          } else if (style.style_type === 'TEXT') {
            tokens.typography[style.name] = {
              id: style.node_id,
              description: style.description || '',
              // Note: Typography details would need to be extracted from the file data
            };
          } else if (style.style_type === 'EFFECT') {
            tokens.effects[style.name] = {
              id: style.node_id,
              description: style.description || '',
              // Note: Effect details would need to be extracted from the file data
            };
          }
        }
      }

      return {
        success: true,
        fileInfo: {
          name: fileData.name,
          lastModified: fileData.lastModified
        },
        tokens
      };

    } catch (error) {
      console.error('Design token extraction error:', error);
      throw error;
    }
  }

  // Compare two design versions
  async compareDesignVersions(fileKey, version1, version2 = null) {
    try {
      const file1 = await this.getFile(fileKey, { version: version1 });
      const file2 = version2 ? await this.getFile(fileKey, { version: version2 }) : await this.getFile(fileKey);

      // Get images for both versions
      const images1 = await this.getImages(fileKey, { 
        format: 'png', 
        scale: 2, 
        version: version1 
      });
      
      const images2 = version2 ? 
        await this.getImages(fileKey, { format: 'png', scale: 2, version: version2 }) :
        await this.getImages(fileKey, { format: 'png', scale: 2 });

      const imageUrls1 = Object.values(images1.images).filter(url => url);
      const imageUrls2 = Object.values(images2.images).filter(url => url);

      if (imageUrls1.length === 0 || imageUrls2.length === 0) {
        throw new Error('Could not generate comparison images');
      }

      // Use Grok to analyze differences
      const comparisonPrompt = `Compare these two versions of a Figma design. Analyze:
1. Visual differences and changes
2. Layout modifications
3. Color and typography changes
4. Component additions, removals, or modifications
5. UX improvements or regressions
6. Design consistency changes
7. Impact assessment of the changes
8. Recommendations for further improvements`;

      const comparison = await grokService.analyzeMultipleImages(
        [imageUrls1[0], imageUrls2[0]], 
        comparisonPrompt
      );

      return {
        success: true,
        versions: {
          version1: { version: version1, lastModified: file1.lastModified },
          version2: { version: version2 || 'current', lastModified: file2.lastModified }
        },
        comparison: comparison.content,
        imageUrls: { version1: imageUrls1[0], version2: imageUrls2[0] }
      };

    } catch (error) {
      console.error('Design comparison error:', error);
      throw error;
    }
  }

  // Batch analyze multiple designs
  async batchAnalyzeDesigns(fileKeys, analysisType = 'general') {
    const results = [];
    
    for (const fileKey of fileKeys) {
      try {
        const result = await this.analyzeDesignWithAI(fileKey, null, analysisType);
        results.push({ fileKey, success: true, ...result });
      } catch (error) {
        results.push({ 
          fileKey, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    return results;
  }
}

// Create singleton instance
const figmaService = new FigmaService();

export default figmaService;