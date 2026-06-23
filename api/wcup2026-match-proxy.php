<?php
/**
 * Proxy/cache pour wcup2026.org/api/data.php?action=match&id=X
 *
 * Récupère les détails d'un match (buteurs, stats) côté serveur,
 * les met en cache (1 jour pour terminé, 30s pour live),
 * et les sert au frontend avec les bons headers CORS.
 */

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($origin !== '*' ? $origin : '*'));
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: public, max-age=30');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$id = isset($_GET['id']) ? intval($_GET['id']) : null;
if ($id === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing id parameter'], JSON_UNESCAPED_UNICODE);
    exit;
}

$cacheDir = __DIR__ . '/../cache';
$cacheFile = $cacheDir . '/wcup2026-match-' . $id . '.json';

function sendJson($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sendError($message, $code = 502) {
    sendJson(['error' => $message], $code);
}

// Servir le cache s'il est encore frais
if (file_exists($cacheFile)) {
    $raw = file_get_contents($cacheFile);
    if ($raw !== false) {
        $cached = json_decode($raw, true);
        if (is_array($cached) && isset($cached['match']['status'])) {
            $status = strtolower($cached['match']['status']);
            $cacheTtl = ($status === 'finished') ? 86400 : 30;
            $age = time() - filemtime($cacheFile);
            if ($age < $cacheTtl) {
                header('X-Cache: hit');
                echo $raw;
                exit;
            }
        }
    }
}

$url = 'https://wcup2026.org/api/data.php?action=match&id=' . $id;
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'User-Agent: foot.tmktools.com-cache-proxy/1.0',
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false || $httpCode < 200 || $httpCode >= 300) {
    if (file_exists($cacheFile)) {
        $cached = file_get_contents($cacheFile);
        if ($cached !== false) {
            header('X-Cache: stale');
            echo $cached;
            exit;
        }
    }
    sendError($curlError ?: "HTTP $httpCode", 502);
}

$data = json_decode($response, true);
if (!is_array($data) || !isset($data['match']) || !is_array($data['match'])) {
    sendError('Invalid payload from upstream', 502);
}

if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}
@file_put_contents($cacheFile, $response);

header('X-Cache: miss');
echo $response;
