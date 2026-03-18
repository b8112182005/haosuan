$env:CLAUDECODE = ""
$env:CLAUDE_CODE_ENTRYPOINT = ""
$env:HOME = "C:\Users\b8112"
$env:PATH = "C:\Users\b8112\AppData\Roaming\npm;C:\Users\b8112\.local\bin;C:\Program Files\nodejs;$env:PATH"

$logFile = "C:\Users\b8112\haosuan\loop.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Add-Content -Path $logFile -Value "[$timestamp] Loop starting"

Set-Location "C:\Users\b8112\haosuan"

& "C:\Users\b8112\.local\bin\claude.exe" --dangerously-skip-permissions "請讀取 LOOP_PROMPT.md 並執行下一個任務" --allowedTools "Bash,Read,Write,Edit,MultiEdit,Glob,Grep,TodoRead,TodoWrite" --model sonnet 2>&1 | Out-File -Append -FilePath $logFile -Encoding utf8

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $logFile -Value "[$timestamp] Loop finished (exit code: $LASTEXITCODE)"
