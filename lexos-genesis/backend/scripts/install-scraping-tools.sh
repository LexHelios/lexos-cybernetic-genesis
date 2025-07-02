#!/bin/bash

echo "🔧 Installing Advanced Web Scraping Tools for LexOS..."

# Update package list
echo "📦 Updating package list..."
sudo apt-get update -qq

# Install system dependencies
echo "🔨 Installing system dependencies..."
sudo apt-get install -y -qq \
    python3-pip \
    python3-dev \
    libxml2-dev \
    libxslt1-dev \
    libssl-dev \
    libffi-dev \
    chromium-browser \
    chromium-chromedriver

# Scrapy - The powerful web scraping framework
echo "🕷️ Installing Scrapy..."
pip3 install --user scrapy

# Requests-HTML - Simple scraping with JS support
echo "🌐 Installing Requests-HTML..."
pip3 install --user requests-html

# MechanicalSoup - Form automation
echo "🤖 Installing MechanicalSoup..."
pip3 install --user MechanicalSoup

# LXML - Fast XML/HTML parsing
echo "⚡ Installing LXML..."
pip3 install --user lxml cssselect

# BeautifulSoup - HTML parsing (bonus)
echo "🍲 Installing BeautifulSoup..."
pip3 install --user beautifulsoup4

# Selenium - Browser automation
echo "🌟 Installing Selenium..."
pip3 install --user selenium

# Additional useful libraries
echo "📚 Installing additional libraries..."
pip3 install --user \
    pyppeteer \
    scrapy-splash \
    scrapy-playwright \
    fake-useragent \
    python-anticaptcha \
    cloudscraper \
    requests-cache \
    httpx \
    parsel

# Install Crawl4AI if available
echo "🤖 Attempting to install Crawl4AI..."
pip3 install --user crawl4ai || echo "⚠️ Crawl4AI installation failed (optional)"

# Install browser drivers for Playwright
echo "🎭 Installing Playwright browsers..."
pip3 install --user playwright
python3 -m playwright install chromium firefox webkit || echo "⚠️ Playwright browsers installation failed (optional)"

# Create Python script to verify installations
cat > /tmp/verify_scraping_tools.py << 'EOF'
#!/usr/bin/env python3
import sys

def check_module(module_name, import_name=None):
    if not import_name:
        import_name = module_name
    try:
        __import__(import_name)
        print(f"✅ {module_name} installed successfully")
        return True
    except ImportError:
        print(f"❌ {module_name} not installed")
        return False

print("\n🔍 Verifying installed scraping tools...\n")

tools = [
    ("Scrapy", "scrapy"),
    ("Requests-HTML", "requests_html"),
    ("MechanicalSoup", "mechanicalsoup"),
    ("LXML", "lxml"),
    ("BeautifulSoup", "bs4"),
    ("Selenium", "selenium"),
    ("Playwright", "playwright"),
    ("Pyppeteer", "pyppeteer"),
    ("Parsel", "parsel"),
    ("Cloudscraper", "cloudscraper"),
    ("HTTPX", "httpx"),
    ("Crawl4AI", "crawl4ai")
]

installed = 0
for tool_name, import_name in tools:
    if check_module(tool_name, import_name):
        installed += 1

print(f"\n📊 Summary: {installed}/{len(tools)} tools installed successfully")

# Test Scrapy command
import subprocess
try:
    subprocess.run(["scrapy", "version"], capture_output=True, check=True)
    print("✅ Scrapy command-line tool is available")
except:
    print("⚠️ Scrapy command-line tool not in PATH")

print("\n✨ Installation complete!")
EOF

# Run verification
echo -e "\n📋 Verification Results:"
python3 /tmp/verify_scraping_tools.py

# Add tools to PATH if needed
echo -e "\n🔧 Setting up environment..."
if ! echo $PATH | grep -q "$HOME/.local/bin"; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    echo "✅ Added ~/.local/bin to PATH (restart shell or run: source ~/.bashrc)"
fi

# Create example configuration
mkdir -p ~/lexos-genesis/backend/config
cat > ~/lexos-genesis/backend/config/scraping-tools.json << 'EOF'
{
  "scrapy": {
    "settings": {
      "USER_AGENT": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      "ROBOTSTXT_OBEY": true,
      "CONCURRENT_REQUESTS": 16,
      "DOWNLOAD_DELAY": 0.5,
      "COOKIES_ENABLED": true,
      "RETRY_TIMES": 3,
      "RETRY_HTTP_CODES": [500, 502, 503, 504, 408, 429]
    }
  },
  "zenrows": {
    "api_endpoint": "https://api.zenrows.com/v1/",
    "default_options": {
      "js_render": true,
      "premium_proxy": false,
      "wait_for": 3000
    }
  },
  "selenium": {
    "chrome_options": [
      "--headless",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor"
    ]
  },
  "playwright": {
    "launch_options": {
      "headless": true,
      "args": ["--no-sandbox", "--disable-setuid-sandbox"]
    }
  }
}
EOF

echo -e "\n✅ Configuration file created at: ~/lexos-genesis/backend/config/scraping-tools.json"

# Create example scrapers directory
mkdir -p ~/lexos-genesis/backend/scrapers/examples

# Create example Scrapy spider
cat > ~/lexos-genesis/backend/scrapers/examples/example_spider.py << 'EOF'
import scrapy

class ExampleSpider(scrapy.Spider):
    name = 'example'
    allowed_domains = ['example.com']
    start_urls = ['http://example.com/']
    
    custom_settings = {
        'USER_AGENT': 'LexOS-Scraper/1.0',
        'DOWNLOAD_DELAY': 1,
    }
    
    def parse(self, response):
        # Extract data
        yield {
            'title': response.css('title::text').get(),
            'url': response.url,
            'headers': dict(response.headers),
            'body_text': response.css('body::text').getall(),
        }
        
        # Follow links
        for link in response.css('a::attr(href)').getall():
            yield response.follow(link, self.parse)
EOF

echo "✅ Example scrapers created at: ~/lexos-genesis/backend/scrapers/examples/"

echo -e "\n🎉 Advanced scraping tools installation complete!"
echo -e "\n📚 Quick Start Guide:"
echo "1. Scrapy: scrapy startproject myproject"
echo "2. Test installation: python3 -c 'import scrapy; print(scrapy.__version__)'"
echo "3. View examples: ls ~/lexos-genesis/backend/scrapers/examples/"
echo -e "\n💡 Remember to:"
echo "- Set ZENROWS_API_KEY in .env if you have one"
echo "- Respect robots.txt and rate limits"
echo "- Use appropriate User-Agent strings"
echo "- Handle errors gracefully"

# Clean up
rm -f /tmp/verify_scraping_tools.py