param([string]$DocxPath, [string]$OutPath)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($DocxPath)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$content = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

# Remove XML tags using regex
$text = [System.Text.RegularExpressions.Regex]::Replace($content, '<[^>]+>', ' ')
# Clean spaces
$text = [System.Text.RegularExpressions.Regex]::Replace($text, '\s+', ' ')
Set-Content -Path $OutPath -Value $text -Encoding UTF8
Write-Host "Length: " $text.Length
