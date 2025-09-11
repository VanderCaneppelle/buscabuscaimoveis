# Script PowerShell para testar endpoints de notificação
Write-Host "🧪 Testando endpoints de notificação..." -ForegroundColor Green
Write-Host ""

$API_URL = "http://localhost:3000"

# Teste 1: Status do sistema
Write-Host "1️⃣ Testando status do sistema..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/notifications?action=status" -Method GET -ContentType "application/json"
    Write-Host "✅ Status: $($response.message)" -ForegroundColor Green
    Write-Host "📊 Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Teste 2: Registrar token
Write-Host "2️⃣ Testando registro de token..." -ForegroundColor Yellow
$registerBody = @{
    token = "ExponentPushToken[test-123]"
    userId = "test-user-123"
    platform = "android"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/notifications?action=register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "✅ Token registrado: $($response.message)" -ForegroundColor Green
    Write-Host "📊 Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Teste 3: Enviar notificação
Write-Host "3️⃣ Testando envio de notificação..." -ForegroundColor Yellow
$sendBody = @{
    title = "🧪 Teste de Notificação"
    body = "Esta é uma notificação de teste!"
    data = @{
        type = "test"
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
    userId = "test-user-123"
    sendToAll = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/notifications?action=send" -Method POST -Body $sendBody -ContentType "application/json"
    Write-Host "✅ Notificação enviada: $($response.message)" -ForegroundColor Green
    Write-Host "📊 Enviado para: $($response.sent)/$($response.total) dispositivos" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Teste 4: Notificações agendadas
Write-Host "4️⃣ Testando notificações agendadas..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/notifications?action=schedule" -Method POST -ContentType "application/json"
    Write-Host "✅ Notificações agendadas: $($response.message)" -ForegroundColor Green
    Write-Host "📊 Total enviado: $($response.totalSent) para $($response.totalDevices) dispositivos" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "🏁 Testes concluídos!" -ForegroundColor Green
Read-Host "Pressione Enter para continuar"
