#!/usr/bin/env python3
"""
CI/CD Build Verification Script
Tests that the minimal requirements are sufficient for basic CI/CD operations
"""

import sys
import os
import subprocess

def test_python_imports():
    """Test that essential Python modules can be imported"""
    print("Testing Python imports...")
    try:
        import django
        print(f"✓ Django {django.VERSION} imported successfully")
        
        import rest_framework
        print(f"✓ Django REST Framework imported successfully")
        
        import corsheaders
        print(f"✓ Django CORS Headers imported successfully")
        
        import requests
        print(f"✓ Requests library imported successfully")
        
        import pytest
        print(f"✓ Pytest imported successfully")
        
        return True
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False

def test_django_syntax():
    """Test Django project syntax"""
    print("\nTesting Django syntax...")
    try:
        # Test manage.py syntax
        result = subprocess.run([sys.executable, "-m", "py_compile", "manage.py"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ manage.py syntax check passed")
        else:
            print(f"✗ manage.py syntax check failed: {result.stderr}")
            return False
        
        # Test settings syntax
        result = subprocess.run([sys.executable, "-m", "py_compile", "aprs_server/settings.py"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ settings.py syntax check passed")
        else:
            print(f"✗ settings.py syntax check failed: {result.stderr}")
            return False
        
        return True
    except Exception as e:
        print(f"✗ Django syntax test failed: {e}")
        return False

def main():
    """Run all CI/CD verification tests"""
    print("APRSwx CI/CD Build Verification")
    print("=" * 40)
    
    success = True
    
    # Test imports
    if not test_python_imports():
        success = False
    
    # Test Django syntax
    if not test_django_syntax():
        success = False
    
    print("\n" + "=" * 40)
    if success:
        print("✓ All CI/CD verification tests passed!")
        print("The minimal requirements are sufficient for basic CI/CD operations.")
        return 0
    else:
        print("✗ Some CI/CD verification tests failed!")
        print("Check the errors above and fix dependencies.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
