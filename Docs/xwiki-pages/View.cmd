@echo off
start "XWiki Viewer Server" powershell -ExecutionPolicy Bypass -File "%~dp0viewer-impl\Open-XWikiViewer.ps1"
