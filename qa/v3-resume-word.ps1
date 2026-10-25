param([Parameter(Mandatory=$true)][string]$Shots)
$ErrorActionPreference = 'Stop'
$resumeWord = $null
$resumeDocument = $null
$resumeNoSave = 0
$resumeNo = $false
$resumeReadOnly = $true
try {
  $resumeWord = New-Object -ComObject Word.Application
  $resumeWord.Visible = $false
  $resumeWord.DisplayAlerts = 0
  $resumeWord.AutomationSecurity = 3
  $resumeBeforePath = [System.IO.Path]::Combine($Shots, 'word-before.docx')
  $resumeAfterPath = [System.IO.Path]::Combine($Shots, 'word-after.docx')
  $resumeBeforePdf = [System.IO.Path]::Combine($Shots, 'word-before.pdf')
  $resumeAfterPdf = [System.IO.Path]::Combine($Shots, 'word-after.pdf')
  $resumeDocument = $resumeWord.Documents.Open([ref]$resumeBeforePath, [ref]$resumeNo, [ref]$resumeReadOnly, [ref]$resumeNo)
  $resumeDocument.Repaginate()
  $resumeBeforePages = $resumeDocument.ComputeStatistics(2)
  $resumeDocument.ExportAsFixedFormat($resumeBeforePdf, 17)
  $resumeDocument.Close([ref]$resumeNoSave)
  $resumeDocument = $null
  $resumeDocument = $resumeWord.Documents.Open([ref]$resumeAfterPath, [ref]$resumeNo, [ref]$resumeReadOnly, [ref]$resumeNo)
  $resumeDocument.Repaginate()
  $resumeAfterPages = $resumeDocument.ComputeStatistics(2)
  $resumeDocument.ExportAsFixedFormat($resumeAfterPdf, 17)
  $resumeDocument.Close([ref]$resumeNoSave)
  $resumeDocument = $null
  if ($resumeAfterPages -gt $resumeBeforePages) { throw "Word added pages: $resumeBeforePages -> $resumeAfterPages" }
  Write-Output "WORD_PAGES before=$resumeBeforePages after=$resumeAfterPages"
} finally {
  if ($null -ne $resumeDocument) { $resumeDocument.Close([ref]$resumeNoSave) }
  if ($null -ne $resumeWord) { $resumeWord.Quit([ref]$resumeNoSave) }
}
