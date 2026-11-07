Add-Type -AssemblyName System.Drawing
$origem = 'C:\Users\Abduzido\.codex\generated_images\01a1896a-7b67-7a21-9856-86293a624d1b'
$itens = @(
    @{Arquivo='exec-77e937f8-07f0-46c5-b8c0-24625d29725d.png'; Nome='04_agora-voce-comeca-tarefa'; Linhas=@('AGORA','VOCÊ','COMEÇA.'); Tamanhos=@(122,122,122); Y=155},
    @{Arquivo='exec-2e7a897a-a07d-45ef-9f1d-01e1775cad11.png'; Nome='05_agora-voce-comeca-clareza'; Linhas=@('AGORA','VOCÊ','COMEÇA.'); Tamanhos=@(122,122,122); Y=155},
    @{Arquivo='exec-8f722147-0d1e-4284-bf48-c2df0dd66ebd.png'; Nome='06_agora-voce-comeca-acao'; Linhas=@('AGORA','VOCÊ','COMEÇA.'); Tamanhos=@(122,122,122); Y=155}
)
foreach ($item in $itens) {
    Copy-Item -LiteralPath (Join-Path $origem $item.Arquivo) -Destination (Join-Path $PSScriptRoot ($item.Nome+'-base.png'))
    $img = [System.Drawing.Image]::FromFile((Join-Path $origem $item.Arquivo))
    $bmp = New-Object System.Drawing.Bitmap 1280,720
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.DrawImage($img,0,0,1280,720)
    $y = $item.Y
    for ($i=0; $i -lt $item.Linhas.Count; $i++) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $font = New-Object System.Drawing.FontFamily 'Impact'
        $point = New-Object System.Drawing.PointF 44,$y
        $path.AddString($item.Linhas[$i],$font,0,[single]$item.Tamanhos[$i],$point,[System.Drawing.StringFormat]::GenericTypographic)
        $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(6,20,38)),7
        $pen.LineJoin = 'Round'
        $g.DrawPath($pen,$path)
        $color = if ($i -eq ($item.Linhas.Count-1)) {[System.Drawing.Color]::FromArgb(255,199,54)} else {[System.Drawing.Color]::FromArgb(255,253,243)}
        $brush = New-Object System.Drawing.SolidBrush $color
        $g.FillPath($brush,$path)
        $y += $item.Tamanhos[$i]+7
        $path.Dispose(); $pen.Dispose(); $brush.Dispose(); $font.Dispose()
    }
    $bmp.Save((Join-Path $PSScriptRoot ($item.Nome+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save((Join-Path $PSScriptRoot ($item.Nome+'.jpg')),[System.Drawing.Imaging.ImageFormat]::Jpeg)
    $mini = New-Object System.Drawing.Bitmap 320,180
    $mg = [System.Drawing.Graphics]::FromImage($mini)
    $mg.InterpolationMode='HighQualityBicubic'
    $mg.DrawImage($bmp,0,0,320,180)
    $mini.Save((Join-Path $PSScriptRoot ($item.Nome+'-preview.png')),[System.Drawing.Imaging.ImageFormat]::Png)
    $mg.Dispose(); $mini.Dispose(); $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}

