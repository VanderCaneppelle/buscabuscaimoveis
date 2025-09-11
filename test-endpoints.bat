@echo off
echo 🧪 Testando endpoints de notificação...
echo.

set API_URL=http://localhost:3000

echo 1️⃣ Testando status do sistema...
curl -X GET "%API_URL%/api/notifications?action=status" -H "Content-Type: application/json"
echo.
echo.

echo 2️⃣ Testando registro de token...
curl -X POST "%API_URL%/api/notifications?action=register" ^
  -H "Content-Type: application/json" ^
  -d "{\"token\":\"ExponentPushToken[test-123]\",\"userId\":\"test-user-123\",\"platform\":\"android\"}"
echo.
echo.

echo 3️⃣ Testando envio de notificação...
curl -X POST "%API_URL%/api/notifications?action=send" ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"🧪 Teste\",\"body\":\"Notificação de teste!\",\"data\":{\"type\":\"test\"},\"userId\":\"test-user-123\",\"sendToAll\":false}"
echo.
echo.

echo 4️⃣ Testando notificações agendadas...
curl -X POST "%API_URL%/api/notifications?action=schedule" ^
  -H "Content-Type: application/json"
echo.
echo.

echo ✅ Testes concluídos!
pause
