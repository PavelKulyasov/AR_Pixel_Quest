param([string]$Voice = 'Microsoft Irina Desktop', [switch]$Force)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $repoRoot
try {
  node scripts/collect-voice-lines.cjs
  if ($LASTEXITCODE -ne 0) { throw 'Could not collect dialogue lines' }
  Add-Type -AssemblyName System.Speech
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.SelectVoice($Voice)
  $destination = Join-Path $repoRoot 'games/pixel-quest/assets/voices/ru-RU'
  $lines = Get-Content tmp/voice-lines.json -Raw -Encoding UTF8 | ConvertFrom-Json
  $clips = [ordered]@{}
  try {
    foreach ($line in $lines) {
      $audioPath = Join-Path $destination $line.file
      if ($Force -or !(Test-Path -LiteralPath $audioPath)) {
        $synth.Rate = 0
        if ($line.speaker -eq 'Система') { $synth.Rate = -1 }
        $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
        $synth.SetOutputToWaveFile($audioPath, $format)
        if ($line.text -match '[\p{L}\p{N}]') { $synth.Speak($line.text) } else { $synth.SpeakSsml('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ru-RU"><break time="500ms"/></speak>') }
        $synth.SetOutputToNull()
      }
      $clips[$line.key] = @{file=$line.file; text=$line.text; speaker=$line.speaker}
    }
  } finally { $synth.Dispose() }
  $manifest = [ordered]@{schema=1; voice=$Voice; language='ru-RU'; sampleRate=22050; clips=$clips}
  $json = $manifest | ConvertTo-Json -Depth 8
  [IO.File]::WriteAllText((Join-Path $destination 'manifest.json'), $json, (New-Object Text.UTF8Encoding $false))
  Write-Output ('Generated ' + $clips.Count + ' local WAV clips')
} finally { Pop-Location }
