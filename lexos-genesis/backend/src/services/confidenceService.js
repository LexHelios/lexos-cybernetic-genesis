class ConfidenceService {
  // Evaluate confidence score for coding responses
  evaluateCodingConfidence(response, task, code = '') {
    let confidence = 100;
    const responseText = response.content || response.response || response;
    
    // Deduct points for uncertainty indicators
    const uncertaintyPatterns = [
      /i'm not sure/gi,
      /might be/gi,
      /possibly/gi,
      /perhaps/gi,
      /could be/gi,
      /not certain/gi,
      /unclear/gi,
      /difficult to say/gi,
      /hard to tell/gi,
      /i think/gi,
      /probably/gi,
      /likely/gi,
      /maybe/gi,
      /potentially/gi
    ];

    uncertaintyPatterns.forEach(pattern => {
      const matches = responseText.match(pattern);
      if (matches) {
        confidence -= matches.length * 15; // -15 per uncertainty phrase
      }
    });

    // Deduct points for generic/vague responses
    const vaguenessIndicators = [
      /here's a simple example/gi,
      /basic implementation/gi,
      /general approach/gi,
      /depends on your needs/gi,
      /varies depending/gi,
      /it depends/gi
    ];

    vaguenessIndicators.forEach(pattern => {
      const matches = responseText.match(pattern);
      if (matches) {
        confidence -= matches.length * 10; // -10 per vague phrase
      }
    });

    // Check for code quality indicators
    const codeBlocks = responseText.match(/```[\s\S]*?```/g) || [];
    
    if (codeBlocks.length > 0) {
      codeBlocks.forEach(block => {
        // Add points for good practices
        if (block.includes('//') || block.includes('/*') || block.includes('#')) {
          confidence += 5; // Comments are good
        }
        if (block.includes('try') && block.includes('catch')) {
          confidence += 5; // Error handling
        }
        if (block.includes('const ') || block.includes('let ')) {
          confidence += 3; // Modern JS practices
        }
        if (block.includes('async') || block.includes('await')) {
          confidence += 3; // Async handling
        }
        
        // Deduct for poor practices
        if (block.includes('TODO') || block.includes('FIXME')) {
          confidence -= 10; // Incomplete code
        }
        if (block.includes('...') && !block.includes('spread')) {
          confidence -= 15; // Ellipsis indicating incomplete code
        }
      });
    } else if (task.toLowerCase().includes('code') || task.toLowerCase().includes('implement')) {
      // Task asks for code but no code blocks provided
      confidence -= 30;
    }

    // Check response length appropriateness
    if (responseText.length < 50 && (task.length > 100 || code.length > 100)) {
      confidence -= 25; // Too short for complex task
    }

    // Boost confidence for specific technical details
    const technicalPatterns = [
      /algorithm/gi,
      /complexity/gi,
      /performance/gi,
      /optimization/gi,
      /best practice/gi,
      /security/gi,
      /scalability/gi,
      /memory/gi,
      /efficiency/gi
    ];

    technicalPatterns.forEach(pattern => {
      const matches = responseText.match(pattern);
      if (matches) {
        confidence += matches.length * 3; // +3 per technical term
      }
    });

    // Check for proper error handling discussion
    if (task.toLowerCase().includes('error') || task.toLowerCase().includes('exception')) {
      if (responseText.toLowerCase().includes('try') || responseText.toLowerCase().includes('catch') || 
          responseText.toLowerCase().includes('error handling')) {
        confidence += 10;
      } else {
        confidence -= 20;
      }
    }

    // Ensure confidence is within bounds
    confidence = Math.max(0, Math.min(100, confidence));
    
    return {
      score: confidence,
      threshold: 90,
      shouldEscalate: confidence < 90,
      factors: this.getConfidenceFactors(responseText, task, code),
      model: 'open-source'
    };
  }

  getConfidenceFactors(response, task, code) {
    const factors = {
      hasUncertainty: /i'm not sure|might be|possibly|perhaps|unclear/gi.test(response),
      hasCodeBlocks: /```[\s\S]*?```/g.test(response),
      hasComments: /\/\/|\/\*|#/.test(response),
      hasErrorHandling: /try.*catch|error handling/gi.test(response),
      isAppropriateLength: response.length > 50,
      hasTechnicalDetail: /algorithm|complexity|performance|optimization/gi.test(response),
      isCompleteCode: !/\.\.\./.test(response) || response.includes('spread')
    };

    return factors;
  }

  // Evaluate confidence for different types of tasks
  evaluateTaskConfidence(task, response, taskType = 'general') {
    switch (taskType.toLowerCase()) {
      case 'coding':
      case 'code':
      case 'programming':
        return this.evaluateCodingConfidence(response, task);
      
      case 'debugging':
      case 'debug':
        return this.evaluateDebuggingConfidence(response, task);
      
      case 'review':
      case 'code-review':
        return this.evaluateReviewConfidence(response, task);
      
      default:
        return this.evaluateGeneralConfidence(response, task);
    }
  }

  evaluateDebuggingConfidence(response, task) {
    let confidence = this.evaluateCodingConfidence(response, task).score;
    
    const responseText = response.content || response.response || response;
    
    // Look for debugging-specific indicators
    if (responseText.toLowerCase().includes('root cause')) confidence += 10;
    if (responseText.toLowerCase().includes('stack trace')) confidence += 5;
    if (responseText.toLowerCase().includes('breakpoint')) confidence += 5;
    if (responseText.toLowerCase().includes('console.log') || responseText.toLowerCase().includes('print')) confidence += 3;
    
    // Deduct if no clear solution provided
    if (!responseText.toLowerCase().includes('fix') && !responseText.toLowerCase().includes('solution')) {
      confidence -= 20;
    }
    
    confidence = Math.max(0, Math.min(100, confidence));
    
    return {
      score: confidence,
      threshold: 90,
      shouldEscalate: confidence < 90,
      model: 'open-source'
    };
  }

  evaluateReviewConfidence(response, task) {
    let confidence = 85; // Start higher for reviews
    
    const responseText = response.content || response.response || response;
    
    // Look for review-specific elements
    const reviewElements = [
      'security', 'performance', 'readability', 'maintainability',
      'best practice', 'vulnerability', 'optimization', 'refactor'
    ];
    
    reviewElements.forEach(element => {
      if (responseText.toLowerCase().includes(element)) {
        confidence += 3;
      }
    });
    
    // Check for structured review
    if (responseText.includes('1.') || responseText.includes('•') || responseText.includes('-')) {
      confidence += 10; // Structured feedback
    }
    
    confidence = Math.max(0, Math.min(100, confidence));
    
    return {
      score: confidence,
      threshold: 90,
      shouldEscalate: confidence < 90,
      model: 'open-source'
    };
  }

  evaluateGeneralConfidence(response, task) {
    let confidence = 75; // Start lower for general tasks
    
    const responseText = response.content || response.response || response;
    
    // Basic quality indicators
    if (responseText.length > task.length) confidence += 10;
    if (responseText.includes('example')) confidence += 5;
    if (responseText.includes('specifically')) confidence += 3;
    
    // Uncertainty deduction
    if (/not sure|unclear|difficult|complex/gi.test(responseText)) {
      confidence -= 15;
    }
    
    confidence = Math.max(0, Math.min(100, confidence));
    
    return {
      score: confidence,
      threshold: 90,
      shouldEscalate: confidence < 90,
      model: 'open-source'
    };
  }

  // Log confidence decisions for monitoring
  logConfidenceDecision(task, confidence, escalated = false) {
    const timestamp = new Date().toISOString();
    console.log(`[Confidence] ${timestamp} - Task: "${task.substring(0, 50)}..." Score: ${confidence.score}% ${escalated ? '(ESCALATED)' : '(ACCEPTED)'}`);
  }
}

export default new ConfidenceService();