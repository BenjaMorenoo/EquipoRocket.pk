param(
    [string]$Name = 'equiporocket-net'
)

try {
    $exists = docker network ls --format '{{.Name}}' | Select-String -SimpleMatch $Name -Quiet
} catch {
    Write-Error "Docker command failed: $_"
    exit 1
}

if ($exists) {
    Write-Host "Docker network '$Name' already exists."
} else {
    try {
        docker network create $Name | Out-Null
        Write-Host "Created Docker network '$Name'."
    } catch {
        Write-Error "Failed to create network: $_"
        exit 1
    }
}
