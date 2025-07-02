import express from 'express';
import figmaService from '../services/figmaService.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Get Figma file information
router.get('/file/:fileKey', verifyToken, async (req, res) => {
  try {
    const { fileKey } = req.params;
    const options = req.query;
    
    const fileData = await figmaService.getFile(fileKey, options);
    res.json({
      success: true,
      data: fileData
    });
  } catch (error) {
    console.error('Figma file fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch Figma file' });
  }
});

// Get file nodes
router.get('/file/:fileKey/nodes', verifyToken, async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { ids } = req.query;
    const options = req.query;
    
    if (!ids) {
      return res.status(400).json({ error: 'Node IDs are required' });
    }
    
    const nodeData = await figmaService.getFileNodes(fileKey, ids, options);
    res.json({
      success: true,
      data: nodeData
    });
  } catch (error) {
    console.error('Figma nodes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch Figma nodes' });
  }
});

// Get file images
router.get('/file/:fileKey/images', verifyToken, async (req, res) => {
  try {
    const { fileKey } = req.params;
    const options = req.query;
    
    const images = await figmaService.getImages(fileKey, options);
    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    console.error('Figma images fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch Figma images' });
  }
});

// AI-powered design analysis
router.post('/analyze/:fileKey', verifyToken, async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { nodeIds, analysisType = 'general' } = req.body;
    
    const analysis = await figmaService.analyzeDesignWithAI(fileKey, nodeIds, analysisType);
    res.json({
      success: true,
      ...analysis
    });
  } catch (error) {
    console.error('Figma AI analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze design with AI' });
  }
});

// Generate code from design
router.post('/generate-code/:fileKey', verifyToken, async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { nodeIds, codeType = 'react' } = req.body;
    
    const codeGeneration = await figmaService.generateCodeFromDesign(fileKey, nodeIds, codeType);
    res.json({
      success: true,
      ...codeGeneration
    });
  } catch (error) {
    console.error('Figma code generation error:', error);
    res.status(500).json({ error: 'Failed to generate code from design' });
  }
});

// Review design for UX/UI
router.post('/review-ux/:fileKey', verifyToken, async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { nodeIds } = req.body;
    
    const review = await figmaService.reviewDesignUX(fileKey, nodeIds);
    res.json({
      success: true,
      ...review
    });
  } catch (error) {
    console.error('Figma UX review error:', error);
    res.status(500).json({ error: 'Failed to review design UX' });
  }
});

// Analyze design system
router.post('/design-system/:fileKey', verifyToken, async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { nodeIds } = req.body;
    
    const analysis = await figmaService.analyzeDesignSystem(fileKey, nodeIds);
    res.json({
      success: true,
      ...analysis
    });
  } catch (error) {
    console.error('Figma design system analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze design system' });
  }
});

// Prepare design for handoff
router.post('/handoff/:fileKey', verifyToken, async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { nodeIds } = req.body;
    
    const handoff = await figmaService.prepareHandoff(fileKey, nodeIds);
    res.json({
      success: true,
      ...handoff
    });
  } catch (error) {
    console.error('Figma handoff preparation error:', error);
    res.status(500).json({ error: 'Failed to prepare design handoff' });
  }
});

// Extract design tokens
router.get('/tokens/:fileKey', verifyToken, async (req, res) => {
  try {
    const { fileKey } = req.params;
    
    const tokens = await figmaService.extractDesignTokens(fileKey);
    res.json({
      success: true,
      ...tokens
    });
  } catch (error) {
    console.error('Figma design tokens extraction error:', error);
    res.status(500).json({ error: 'Failed to extract design tokens' });
  }
});

// Compare design versions
router.post('/compare/:fileKey', verifyToken, async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { version1, version2 } = req.body;
    
    if (!version1) {
      return res.status(400).json({ error: 'version1 is required' });
    }
    
    const comparison = await figmaService.compareDesignVersions(fileKey, version1, version2);
    res.json({
      success: true,
      ...comparison
    });
  } catch (error) {
    console.error('Figma version comparison error:', error);
    res.status(500).json({ error: 'Failed to compare design versions' });
  }
});

// Batch analyze multiple designs
router.post('/batch-analyze', verifyToken, async (req, res) => {
  try {
    const { fileKeys, analysisType = 'general' } = req.body;
    
    if (!fileKeys || !Array.isArray(fileKeys)) {
      return res.status(400).json({ error: 'fileKeys array is required' });
    }
    
    if (fileKeys.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 files allowed per batch' });
    }
    
    const results = await figmaService.batchAnalyzeDesigns(fileKeys, analysisType);
    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('Figma batch analysis error:', error);
    res.status(500).json({ error: 'Failed to perform batch analysis' });
  }
});

// Get file components
router.get('/file/:fileKey/components', verifyToken, async (req, res) => {
  try {
    const { fileKey } = req.params;
    
    const components = await figmaService.getFileComponents(fileKey);
    res.json({
      success: true,
      data: components
    });
  } catch (error) {
    console.error('Figma components fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch file components' });
  }
});

// Get file styles
router.get('/file/:fileKey/styles', verifyToken, async (req, res) => {
  try {
    const { fileKey } = req.params;
    
    const styles = await figmaService.getFileStyles(fileKey);
    res.json({
      success: true,
      data: styles
    });
  } catch (error) {
    console.error('Figma styles fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch file styles' });
  }
});

// Get team projects
router.get('/team/:teamId/projects', verifyToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const projects = await figmaService.getTeamProjects(teamId);
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Figma team projects fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch team projects' });
  }
});

// Get project files
router.get('/project/:projectId/files', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const options = req.query;
    
    const files = await figmaService.getProjectFiles(projectId, options);
    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('Figma project files fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch project files' });
  }
});

// Webhook endpoint for Figma file changes
router.post('/webhook', async (req, res) => {
  try {
    const { event_type, file_key, file_name, timestamp } = req.body;
    
    console.log(`[Figma Webhook] ${event_type} - ${file_name} (${file_key}) at ${timestamp}`);
    
    // Handle different event types
    switch (event_type) {
      case 'FILE_UPDATE':
        // File was updated
        console.log(`File ${file_name} was updated`);
        break;
      case 'FILE_DELETE':
        // File was deleted
        console.log(`File ${file_name} was deleted`);
        break;
      case 'FILE_VERSION_UPDATE':
        // New version created
        console.log(`New version created for file ${file_name}`);
        break;
      default:
        console.log(`Unknown event type: ${event_type}`);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Figma webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;