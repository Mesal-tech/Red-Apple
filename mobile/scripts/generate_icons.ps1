Add-Type -AssemblyName System.Drawing

$mobileDir = Resolve-Path "mobile"
$assetsDir = Join-Path $mobileDir "assets"
$srcPath = Join-Path $assetsDir "splash-icon.png"

Write-Output "Loading source image from $srcPath..."
$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)

# Bounding box of content in splash-icon.png
$cropX = 422
$cropY = 227
$cropW = 1225
$cropH = 1418

$cropRect = [System.Drawing.Rectangle]::new($cropX, $cropY, $cropW, $cropH)
$croppedBmp = $srcBmp.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$srcBmp.Dispose()

# Canvas parameters for 1024x1024
$canvasSize = 1024
# Target height 520, target width maintains aspect ratio
$targetH = 520
$targetW = [int]($targetH * $cropW / $cropH)
# Center with +16px vertical offset to account for upper leaf
$destX = [int](($canvasSize - $targetW) / 2)
$destY = [int](($canvasSize - $targetH) / 2 + 16)
$destRect = [System.Drawing.Rectangle]::new($destX, $destY, $targetW, $targetH)

Write-Output "Artwork placement: X=$destX, Y=$destY, W=$targetW, H=$targetH (Canvas: $canvasSize x $canvasSize)"

# Function to draw high-quality scaled image
function Draw-HighQuality($destBmp, $srcImage, $rect) {
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($srcImage, $rect)
    $g.Dispose()
}

# 1. Generate android-icon-foreground.png (transparent background)
Write-Output "Generating android-icon-foreground.png..."
$fgBmp = [System.Drawing.Bitmap]::new($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
Draw-HighQuality $fgBmp $croppedBmp $destRect
$fgPath = Join-Path $assetsDir "android-icon-foreground.png"
$fgBmp.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)

# 2. Generate android-icon-monochrome.png (grayscale, transparent background)
Write-Output "Generating android-icon-monochrome.png..."
$monoBmp = [System.Drawing.Bitmap]::new($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($y = 0; $y -lt $canvasSize; $y++) {
    for ($x = 0; $x -lt $canvasSize; $x++) {
        $p = $fgBmp.GetPixel($x, $y)
        if ($p.A -gt 0) {
            $gray = [byte]([math]::Round(0.299 * $p.R + 0.587 * $p.G + 0.114 * $p.B))
            $monoBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($p.A, $gray, $gray, $gray))
        }
    }
}
$monoPath = Join-Path $assetsDir "android-icon-monochrome.png"
$monoBmp.Save($monoPath, [System.Drawing.Imaging.ImageFormat]::Png)
$monoBmp.Dispose()
$fgBmp.Dispose()

# 3. Generate android-icon-background.png (pure white)
Write-Output "Generating android-icon-background.png..."
$bgBmp = [System.Drawing.Bitmap]::new($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bgG = [System.Drawing.Graphics]::FromImage($bgBmp)
$bgG.Clear([System.Drawing.Color]::White)
$bgG.Dispose()
$bgPath = Join-Path $assetsDir "android-icon-background.png"
$bgBmp.Save($bgPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bgBmp.Dispose()

# 4. Generate icon.png (pure white background, centered logo)
Write-Output "Generating icon.png..."
$iconBmp = [System.Drawing.Bitmap]::new($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$iconG = [System.Drawing.Graphics]::FromImage($iconBmp)
$iconG.Clear([System.Drawing.Color]::White)
$iconG.Dispose()
Draw-HighQuality $iconBmp $croppedBmp $destRect
$iconPath = Join-Path $assetsDir "icon.png"
$iconBmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$iconBmp.Dispose()

$croppedBmp.Dispose()
Write-Output "Source assets successfully generated!"
