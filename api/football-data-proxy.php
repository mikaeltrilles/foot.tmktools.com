<?php
/**
 * Proxy/cache pour api.football-data.org/v4/competitions/WC/matches
 *
 * Appelé par le frontend pour éviter les blocages CORS.
 * Cache côté serveur 30 secondes.
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

$cacheDir = __DIR__ . '/../cache';
$cacheFile = $cacheDir . '/football-data-wc-matches.json';
$cacheTtl = 30;
$apiKey = '9c6520bc940a44bbb5e6cad8ceea0e16';

function sendJson($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sendError($message, $code = 502) {
    sendJson(['error' => $message], $code);
}

$forceRefresh = isset($_GET['force']) && $_GET['force'] === '1';

// 1) Servir le cache s'il est encore frais
if (!$forceRefresh && file_exists($cacheFile)) {
    $age = time() - filemtime($cacheFile);
    if ($age < $cacheTtl) {
        $cached = file_get_contents($cacheFile);
        if ($cached !== false) {
            header('X-Cache: hit');
            echo $cached;
            exit;
        }
    }
}

// 2) Récupérer les données fraîches côté serveur
$url = 'https://api.football-data.org/v4/competitions/WC/matches';
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'X-Auth-Token: ' . $apiKey,
        'User-Agent: foot.tmktools.com-cache-proxy/1.0',
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false || $httpCode < 200 || $httpCode >= 300) {
    // En cas d'erreur, retourner le cache périmé s'il existe
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

// 3) Valider JSON
$data = json_decode($response, true);
if (!is_array($data) || !isset($data['matches']) || !is_array($data['matches'])) {
    if (file_exists($cacheFile)) {
        $cached = file_get_contents($cacheFile);
        if ($cached !== false) {
            header('X-Cache: stale');
            echo $cached;
            exit;
        }
    }
    sendError('Invalid payload from upstream', 502);
}

// 4) Écrire le cache
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}
@file_put_contents($cacheFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

header('X-Cache: miss');
echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
