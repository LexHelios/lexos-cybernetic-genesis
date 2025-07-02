#!/bin/bash
# Quick fix to redirect port 9000 to 9001
sudo iptables -t nat -A PREROUTING -p tcp --dport 9000 -j REDIRECT --to-port 9001
sudo iptables -t nat -A OUTPUT -p tcp --dport 9000 -o lo -j REDIRECT --to-port 9001

echo "Port redirect added: 9000 -> 9001"