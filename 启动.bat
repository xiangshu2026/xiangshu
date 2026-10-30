@echo off
chcp 65001 >nul
title 象数工坊
echo 正在用默认浏览器打开「象数工坊」...
start "" "%~dp0index.html"
exit
