$Excel = New-Object -ComObject Excel.Application
$Excel.Visible = $False
$Workbook = $Excel.Workbooks.Open('C:\Users\DELL\.openclaw\workspace\百年硕博咨询师专用（2025普通类预测版）.xlsx')
$Sheet = $Workbook.Sheets.Item(1)
Write-Host "Sheet Name: $($Sheet.Name)"
Write-Host "Rows: $($Sheet.UsedRange.Rows.Count)"
Write-Host "Cols: $($Sheet.UsedRange.Columns.Count)"

# Read first row headers
$Header = @()
for ($col = 1; $col -le 10; $col++) {
    $val = $Sheet.Cells.Item(1, $col).Text
    $Header += $val
}
Write-Host "Headers: $Header"

# Read a data row
$Row2 = @()
for ($col = 1; $col -le 10; $col++) {
    $val = $Sheet.Cells.Item(2, $col).Text
    $Row2 += $val
}
Write-Host "Row 2: $Row2"

$Excel.Quit()
