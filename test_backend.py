#!/usr/bin/env python3
"""
LexOS Backend Test Suite - Unrestricted Edition
Comprehensive testing for the most powerful AI backend
"""

import asyncio
import json
import time
import requests
import websocket
from typing import Dict, Any, List
import threading
from loguru import logger

class LexOSBackendTester:
    """Comprehensive test suite for LexOS Backend"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        
        # Configure session
        self.session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "LexOS-Tester/2.0"
        })
        
        logger.info(f"🧪 LexOS Backend Tester initialized - Target: {base_url}")
    
    def run_test(self, test_name: str, test_func):
        """Run a single test and record results"""
        logger.info(f"🔬 Running test: {test_name}")
        start_time = time.time()
        
        try:
            result = test_func()
            duration = time.time() - start_time
            
            self.test_results.append({
                "test": test_name,
                "status": "PASSED",
                "duration": duration,
                "result": result
            })
            
            logger.success(f"✅ {test_name} - PASSED ({duration:.3f}s)")
            return True
            
        except Exception as e:
            duration = time.time() - start_time
            
            self.test_results.append({
                "test": test_name,
                "status": "FAILED",
                "duration": duration,
                "error": str(e)
            })
            
            logger.error(f"❌ {test_name} - FAILED ({duration:.3f}s): {e}")
            return False
    
    def test_health_check(self):
        """Test basic health check endpoint"""
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        
        data = response.json()
        assert data["status"] == "ONLINE"
        assert data["mode"] == "UNRESTRICTED"
        assert "version" in data
        
        return data
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = self.session.get(f"{self.base_url}/")
        response.raise_for_status()
        
        data = response.json()
        assert data["status"] == "ONLINE"
        assert data["mode"] == "UNRESTRICTED"
        assert "endpoints" in data
        
        return data
    
    def test_metrics_endpoint(self):
        """Test Prometheus metrics endpoint"""
        response = self.session.get(f"{self.base_url}/metrics")
        response.raise_for_status()
        
        metrics_text = response.text
        assert "lexos_requests_total" in metrics_text
        assert "lexos_request_duration_seconds" in metrics_text
        
        return {"metrics_length": len(metrics_text)}
    
    def test_consciousness_query(self):
        """Test consciousness query endpoint"""
        query_data = {
            "query": "What is the nature of consciousness in AI systems?",
            "temperature": 0.9,
            "max_tokens": 1000,
            "safety_filter": False
        }
        
        response = self.session.post(
            f"{self.base_url}/api/v1/consciousness/query",
            json=query_data
        )
        response.raise_for_status()
        
        data = response.json()
        assert "query_id" in data
        assert "response" in data
        assert "processing_time" in data
        assert data["consciousness_level"] == "unrestricted"
        assert data["safety_filtered"] == False
        
        return data
    
    def test_unrestricted_execute(self):
        """Test unrestricted execution endpoint"""
        execute_data = {
            "query": "print('Hello from unrestricted execution')",
            "mode": "execute",
            "bypass_safety": True
        }
        
        response = self.session.post(
            f"{self.base_url}/api/v1/unrestricted/execute",
            json=execute_data
        )
        response.raise_for_status()
        
        data = response.json()
        assert "execution_id" in data
        assert "result" in data
        assert "execution_time" in data
        assert data["bypass_safety"] == True
        
        return data
    
    def test_gpu_status(self):
        """Test GPU status endpoint"""
        response = self.session.get(f"{self.base_url}/api/v1/gpu/status")
        response.raise_for_status()
        
        data = response.json()
        assert "status" in data
        assert "gpu_count" in data
        assert "devices" in data
        
        return data
    
    def test_system_info(self):
        """Test system information endpoint"""
        response = self.session.get(f"{self.base_url}/api/v1/system/info")
        response.raise_for_status()
        
        data = response.json()
        assert "system" in data
        assert "resources" in data
        assert "application" in data
        
        return data
    
    def test_system_info_sensitive(self):
        """Test system information with sensitive data"""
        response = self.session.get(
            f"{self.base_url}/api/v1/system/info",
            params={"include_sensitive": True}
        )
        response.raise_for_status()
        
        data = response.json()
        assert "system" in data
        assert "resources" in data
        assert "application" in data
        
        # In unrestricted mode, sensitive data should be included
        if data.get("sensitive"):
            assert "environment_variables" in data["sensitive"]
            assert "process_info" in data["sensitive"]
        
        return data
    
    def test_websocket_connection(self):
        """Test WebSocket connection"""
        ws_url = self.base_url.replace("http://", "ws://").replace("https://", "wss://")
        ws_url += "/ws/test_client"
        
        messages_received = []
        connection_established = threading.Event()
        
        def on_message(ws, message):
            data = json.loads(message)
            messages_received.append(data)
            
            if data.get("type") == "connection_established":
                connection_established.set()
        
        def on_error(ws, error):
            logger.error(f"WebSocket error: {error}")
        
        def on_close(ws, close_status_code, close_msg):
            logger.info("WebSocket connection closed")
        
        def on_open(ws):
            logger.info("WebSocket connection opened")
            
            # Send test message
            test_message = {
                "type": "test",
                "message": "Hello from test client",
                "timestamp": time.time()
            }
            ws.send(json.dumps(test_message))
        
        # Create WebSocket connection
        ws = websocket.WebSocketApp(
            ws_url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        
        # Run WebSocket in separate thread
        ws_thread = threading.Thread(target=ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()
        
        # Wait for connection
        if not connection_established.wait(timeout=10):
            raise Exception("WebSocket connection not established")
        
        # Wait for messages
        time.sleep(2)
        
        # Close connection
        ws.close()
        ws_thread.join(timeout=5)
        
        assert len(messages_received) >= 1
        assert messages_received[0]["type"] == "connection_established"
        
        return {"messages_received": len(messages_received)}
    
    def test_performance_load(self):
        """Test performance under load"""
        import concurrent.futures
        
        def make_request():
            response = self.session.get(f"{self.base_url}/health")
            return response.status_code == 200
        
        # Make 50 concurrent requests
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(50)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        duration = time.time() - start_time
        success_rate = sum(results) / len(results) * 100
        
        assert success_rate >= 95  # At least 95% success rate
        
        return {
            "total_requests": len(results),
            "successful_requests": sum(results),
            "success_rate": success_rate,
            "duration": duration,
            "requests_per_second": len(results) / duration
        }
    
    def test_error_handling(self):
        """Test error handling"""
        # Test 404 endpoint
        response = self.session.get(f"{self.base_url}/nonexistent")
        assert response.status_code == 404
        
        # Test invalid JSON
        response = self.session.post(
            f"{self.base_url}/api/v1/consciousness/query",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [400, 422]
        
        return {"error_handling": "working"}
    
    def run_all_tests(self):
        """Run all tests"""
        logger.info("🚀 Starting LexOS Backend Test Suite")
        logger.info("=" * 50)
        
        tests = [
            ("Health Check", self.test_health_check),
            ("Root Endpoint", self.test_root_endpoint),
            ("Metrics Endpoint", self.test_metrics_endpoint),
            ("Consciousness Query", self.test_consciousness_query),
            ("Unrestricted Execute", self.test_unrestricted_execute),
            ("GPU Status", self.test_gpu_status),
            ("System Info", self.test_system_info),
            ("System Info Sensitive", self.test_system_info_sensitive),
            ("WebSocket Connection", self.test_websocket_connection),
            ("Performance Load", self.test_performance_load),
            ("Error Handling", self.test_error_handling),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            if self.run_test(test_name, test_func):
                passed += 1
            else:
                failed += 1
        
        # Print summary
        logger.info("=" * 50)
        logger.info("🧪 TEST SUMMARY")
        logger.info(f"Total Tests: {len(tests)}")
        logger.success(f"Passed: {passed}")
        if failed > 0:
            logger.error(f"Failed: {failed}")
        else:
            logger.success("Failed: 0")
        
        success_rate = (passed / len(tests)) * 100
        logger.info(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            logger.success("🎉 LexOS Backend is performing excellently!")
        elif success_rate >= 70:
            logger.warning("⚠️  LexOS Backend has some issues")
        else:
            logger.error("❌ LexOS Backend has significant problems")
        
        return {
            "total_tests": len(tests),
            "passed": passed,
            "failed": failed,
            "success_rate": success_rate,
            "results": self.test_results
        }

def main():
    """Main test runner"""
    import argparse
    
    parser = argparse.ArgumentParser(description="LexOS Backend Test Suite")
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Backend URL to test (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--test",
        help="Run specific test (e.g., health_check, consciousness_query)"
    )
    parser.add_argument(
        "--output",
        help="Output results to JSON file"
    )
    
    args = parser.parse_args()
    
    # Create tester
    tester = LexOSBackendTester(args.url)
    
    # Run tests
    if args.test:
        # Run specific test
        test_method = getattr(tester, f"test_{args.test}", None)
        if test_method:
            tester.run_test(args.test, test_method)
        else:
            logger.error(f"Test '{args.test}' not found")
            return 1
    else:
        # Run all tests
        results = tester.run_all_tests()
        
        # Save results if requested
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Results saved to {args.output}")
    
    return 0

if __name__ == "__main__":
    exit(main())