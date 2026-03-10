#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class AutoMerchantAPITester:
    def __init__(self, base_url="https://statement-analyzer-21.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, status, details=""):
        """Log test result"""
        self.test_results.append({
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        print(f"{'✅' if status else '❌'} {test_name}: {'PASS' if status else 'FAIL'} - {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log_result(name, True, f"Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                error_detail = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_data = response.json()
                    error_detail += f" - {error_data.get('detail', '')}"
                except:
                    error_detail += f" - {response.text[:200]}"
                self.log_result(name, False, error_detail)
                return False, {}

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_register(self):
        """Test user registration"""
        test_user_data = {
            "email": f"test_user_{datetime.now().strftime('%Y%m%d_%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test User",
            "company": "Test Company"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True, response
        return False, {}

    def test_login(self):
        """Test login with existing credentials"""
        if not self.token:
            print("❌ No token available, skipping login test")
            return False, {}

        # Create new user for login test
        test_user_data = {
            "email": f"login_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@test.com", 
            "password": "LoginTest123!",
            "name": "Login Test User",
            "company": "Login Test Company"
        }
        
        # Register first
        reg_success, reg_response = self.run_test(
            "Pre-Login Registration",
            "POST", 
            "auth/register",
            200,
            data=test_user_data
        )
        
        if not reg_success:
            return False, {}

        # Now test login
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        
        return self.run_test(
            "User Login",
            "POST",
            "auth/login", 
            200,
            data=login_data
        )

    def test_auth_me(self):
        """Test protected /auth/me endpoint"""
        if not self.token:
            self.log_result("Auth Me", False, "No token available")
            return False, {}

        return self.run_test("Auth Me", "GET", "auth/me", 200)

    def test_get_industries(self):
        """Test industry templates endpoint"""
        return self.run_test("Get Industries", "GET", "industries", 200)

    def test_create_workspace(self):
        """Test workspace creation"""
        if not self.token:
            self.log_result("Create Workspace", False, "No token available")
            return False, {}

        workspace_data = {
            "name": "Test Restaurant Workspace",
            "industry": "restaurant",
            "description": "Test workspace for restaurant campaign",
            "target_locations": ["Miami, FL", "Los Angeles, CA"],
            "lead_sources": ["google_maps", "yelp"]
        }

        success, response = self.run_test(
            "Create Workspace",
            "POST",
            "workspaces",
            200,
            data=workspace_data
        )
        
        if success and 'id' in response:
            self.workspace_id = response['id']
        return success, response

    def test_get_workspaces(self):
        """Test workspace listing"""
        if not self.token:
            self.log_result("Get Workspaces", False, "No token available")
            return False, {}

        return self.run_test("Get Workspaces", "GET", "workspaces", 200)

    def test_get_workspace_detail(self):
        """Test workspace detail endpoint"""
        if not self.token:
            self.log_result("Get Workspace Detail", False, "No token available")
            return False, {}

        if not hasattr(self, 'workspace_id'):
            self.log_result("Get Workspace Detail", False, "No workspace ID available")
            return False, {}

        return self.run_test(
            "Get Workspace Detail", 
            "GET", 
            f"workspaces/{self.workspace_id}", 
            200
        )

    def test_create_lead(self):
        """Test lead creation with workspace"""
        if not self.token:
            self.log_result("Create Lead", False, "No token available")
            return False, {}

        if not hasattr(self, 'workspace_id'):
            self.log_result("Create Lead", False, "No workspace ID available")
            return False, {}

        lead_data = {
            "workspace_id": self.workspace_id,
            "business_name": "Test Restaurant",
            "owner_name": "John Doe",
            "phone": "+1234567890",
            "email": "john@testrestaurant.com",
            "website": "www.testrestaurant.com",
            "industry": "restaurant",
            "city": "Los Angeles",
            "state": "CA",
            "google_rating": 4.5,
            "review_count": 150
        }

        success, response = self.run_test(
            "Create Lead",
            "POST",
            "leads",
            200,
            data=lead_data
        )
        
        if success and 'id' in response:
            self.lead_id = response['id']
        return success, response

    def test_list_leads(self):
        """Test lead listing"""
        if not self.token:
            self.log_result("List Leads", False, "No token available")
            return False, {}

        return self.run_test("List Leads", "GET", "leads", 200)

    def test_discovery_generate(self):
        """Test AI lead discovery engine"""
        if not self.token:
            self.log_result("Discovery Generate", False, "No token available")
            return False, {}

        if not hasattr(self, 'workspace_id'):
            self.log_result("Discovery Generate", False, "No workspace ID available")
            return False, {}

        return self.run_test(
            "Discovery Generate",
            "POST",
            f"discovery/generate?workspace_id={self.workspace_id}&location=Miami, FL&industry=restaurant&source=google_maps&count=5",
            200
        )

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        if not self.token:
            self.log_result("Dashboard Stats", False, "No token available")
            return False, {}

        # Test global stats
        success1, _ = self.run_test("Dashboard Stats (Global)", "GET", "dashboard/stats", 200)
        
        # Test workspace-specific stats
        success2 = True
        if hasattr(self, 'workspace_id'):
            success2, _ = self.run_test(
                "Dashboard Stats (Workspace)", 
                "GET", 
                f"dashboard/stats?workspace_id={self.workspace_id}", 
                200
            )
        
        return success1 and success2, {}

    def test_create_campaign(self):
        """Test campaign creation with workspace"""
        if not self.token:
            self.log_result("Create Campaign", False, "No token available")
            return False, {}

        if not hasattr(self, 'workspace_id'):
            self.log_result("Create Campaign", False, "No workspace ID available")
            return False, {}

        campaign_data = {
            "workspace_id": self.workspace_id,
            "name": "Test SMS Campaign",
            "campaign_type": "sms",
            "target_industries": ["restaurant"],
            "target_locations": ["Miami, FL"],
            "message_template": "Hi {{owner_name}}, we can help reduce your processing fees at {{business_name}}!",
            "follow_up_enabled": True,
            "ai_agent_enabled": True,
            "status": "draft"
        }

        return self.run_test(
            "Create Campaign",
            "POST",
            "campaigns",
            200,
            data=campaign_data
        )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AutoMerchant AI v2.0 API Tests...")
        print(f"Base URL: {self.base_url}")
        
        # Test API health
        self.test_health()
        
        # Test authentication flow
        self.test_register()
        self.test_login()
        self.test_auth_me()
        
        # Test industry templates
        self.test_get_industries()
        
        # Test workspace functionality
        self.test_create_workspace()
        self.test_get_workspaces()
        self.test_get_workspace_detail()
        
        # Test leads functionality (with workspace)
        self.test_create_lead()
        self.test_list_leads()
        self.test_discovery_generate()
        
        # Test dashboard (global and workspace-specific)
        self.test_dashboard_stats()
        
        # Test campaigns (with workspace)
        self.test_create_campaign()
        
        # Print final results
        print(f"\n{'='*50}")
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed!")
            return 1

def main():
    tester = AutoMerchantAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())