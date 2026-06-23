<?php
/**
 * Proxy/cache pour wcup2026.org/api/data.php?action=all
 *
 * Récupère les données côté serveur, les met en cache 30 secondes,
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

$cacheDir = __DIR__ . '/../cache';
$cacheFile = $cacheDir . '/wcup2026-all.json';
$cacheTtl = 30; // secondes (live)

function sendJson($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sendError($message, $code = 502) {
    sendJson(['error' => $message], $code);
}

$forceRefresh = isset($_GET['force']) && $_GET['force'] === '1';

// 1) Servir le cache s'il est encore frais (sauf si force=1)
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

// 2) Récupérer les données fraîches
$url = 'https://wcup2026.org/api/data.php?action=all' . ($forceRefresh ? '&_=' . time() : '');
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 15,
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
    sendError('Invalid payload from upstream', 502);
}

// 4) Fusionner les détails de match déjà en cache (buteurs, stats)
function getMatchDetail($id, $cacheDir) {
    $f = $cacheDir . '/wcup2026-match-' . $id . '.json';
    if (!file_exists($f)) return null;
    $raw = file_get_contents($f);
    if ($raw === false) return null;
    $d = json_decode($raw, true);
    if (!is_array($d) || !isset($d['match']) || !is_array($d['match'])) return null;
    return $d['match'];
}

if (isset($data['matches']) && is_array($data['matches'])) {
    foreach ($data['matches'] as &$match) {
        $status = strtolower($match['status'] ?? '');
        if ($status === 'finished' || $status === 'live' || $status === 'in_play') {
            $detail = getMatchDetail(intval($match['id']), $cacheDir);
            if ($detail && is_array($detail)) {
                if (isset($detail['goals1'])) $match['goals1'] = $detail['goals1'];
                if (isset($detail['goals2'])) $match['goals2'] = $detail['goals2'];
                // Fusionner aussi les scores finaux si le détail est plus récent que l'aperçu
                if (isset($detail['score']) && is_array($detail['score']) && count($detail['score']) === 2) {
                    $match['score'] = $detail['score'];
                }
            }
        }
    }
    unset($match);
}

// 5) Écrire le cache
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}
@file_put_contents($cacheFile, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

header('X-Cache: miss');
echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
