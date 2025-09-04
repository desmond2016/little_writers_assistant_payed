# 性能测试脚本
# 并发用户注册测试

function Test-ConcurrentRegistration {
    param(
        [int]$ConcurrentUsers = 5,
        [int]$TotalUsers = 20,
        [string]$TestName = "并发注册测试"
    )
    
    Write-Host "🚀 开始 $TestName" -ForegroundColor Green
    Write-Host "并发数: $ConcurrentUsers, 总用户数: $TotalUsers" -ForegroundColor Cyan
    
    $jobs = @()
    $startTime = Get-Date
    
    for ($i = 1; $i -le $TotalUsers; $i++) {
        # 控制并发数
        while ((Get-Job -State Running).Count -ge $ConcurrentUsers) {
            Start-Sleep -Milliseconds 100
        }
        
        $job = Start-Job -ScriptBlock {
            param($userNum, $testId)
            
            $body = @{
                username = "perftest_${testId}_$userNum"
                email = "perftest${testId}_$userNum@example.com"
                password = "test123456"
            } | ConvertTo-Json
            
            $requestStart = Get-Date
            
            try {
                $response = Invoke-RestMethod -Uri "http://127.0.0.1:5001/api/register" `
                    -Method POST `
                    -ContentType "application/json" `
                    -Body $body `
                    -TimeoutSec 30
                
                $requestEnd = Get-Date
                $responseTime = ($requestEnd - $requestStart).TotalMilliseconds
                
                return @{
                    Success = $true
                    UserNum = $userNum
                    ResponseTime = $responseTime
                    Message = "注册成功"
                    Database = $response.database
                    Username = $response.user.username
                }
            } catch {
                $requestEnd = Get-Date
                $responseTime = ($requestEnd - $requestStart).TotalMilliseconds
                
                return @{
                    Success = $false
                    UserNum = $userNum
                    ResponseTime = $responseTime
                    Error = $_.Exception.Message
                }
            }
        } -ArgumentList $i, (Get-Date -Format "HHmmss")
        
        $jobs += $job
        Write-Host "." -NoNewline -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "等待所有注册任务完成..." -ForegroundColor Yellow
    $results = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    # 统计结果
    $successResults = $results | Where-Object { $_.Success }
    $failureResults = $results | Where-Object { -not $_.Success }
    
    $successCount = $successResults.Count
    $failureCount = $failureResults.Count
    
    Write-Host ""
    Write-Host "📊 $TestName 结果:" -ForegroundColor Green
    Write-Host "总耗时: $([math]::Round($duration, 2)) 秒" -ForegroundColor White
    Write-Host "成功注册: $successCount" -ForegroundColor Green
    Write-Host "失败注册: $failureCount" -ForegroundColor Red
    Write-Host "成功率: $([math]::Round($successCount / $TotalUsers * 100, 2))%" -ForegroundColor Cyan
    Write-Host "平均TPS: $([math]::Round($TotalUsers / $duration, 2))" -ForegroundColor Cyan
    
    if ($successResults) {
        $avgResponseTime = ($successResults | Measure-Object -Property ResponseTime -Average).Average
        $minResponseTime = ($successResults | Measure-Object -Property ResponseTime -Minimum).Minimum
        $maxResponseTime = ($successResults | Measure-Object -Property ResponseTime -Maximum).Maximum
        
        Write-Host "平均响应时间: $([math]::Round($avgResponseTime, 2)) ms" -ForegroundColor White
        Write-Host "最快响应时间: $([math]::Round($minResponseTime, 2)) ms" -ForegroundColor White
        Write-Host "最慢响应时间: $([math]::Round($maxResponseTime, 2)) ms" -ForegroundColor White
    }
    
    # 显示失败详情
    if ($failureResults) {
        Write-Host ""
        Write-Host "❌ 失败详情:" -ForegroundColor Red
        $failureResults | ForEach-Object {
            Write-Host "  用户$($_.UserNum): $($_.Error)" -ForegroundColor Red
        }
    }
    
    return @{
        TestName = $TestName
        TotalUsers = $TotalUsers
        ConcurrentUsers = $ConcurrentUsers
        Duration = $duration
        SuccessCount = $successCount
        FailureCount = $failureCount
        SuccessRate = $successCount / $TotalUsers * 100
        TPS = $TotalUsers / $duration
        AvgResponseTime = if ($successResults) { ($successResults | Measure-Object -Property ResponseTime -Average).Average } else { 0 }
        MinResponseTime = if ($successResults) { ($successResults | Measure-Object -Property ResponseTime -Minimum).Minimum } else { 0 }
        MaxResponseTime = if ($successResults) { ($successResults | Measure-Object -Property ResponseTime -Maximum).Maximum } else { 0 }
    }
}

# 执行轻负载测试
Write-Host "=== 任务3.1: 轻负载注册测试 ===" -ForegroundColor Magenta
$lightLoadResult = Test-ConcurrentRegistration -ConcurrentUsers 5 -TotalUsers 20 -TestName "轻负载注册测试"
