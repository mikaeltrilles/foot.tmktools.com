<?php
/**
 * Chauffe le cache des détails de match (buteurs, stats) pour wcup2026.org.
 *
 * À appeler via CLI ou cron. Utilise curl_multi pour récupérer les matchs
 * terminés/en cours en parallèle.
 */

set_time_limit(300);

$cacheDir = __DIR__ . '/../cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}

function fetchUrl($url, $timeout = 15) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'User-Agent: foot.tmktools.com-cache-proxy/1.0',
        ],
    ]);
    return $ch;
}

function fetchMulti(array $urls) {
    $mh = curl_multi_init();
    $handles = [];
    foreach ($urls as $key => $url) {
        $ch = fetchUrl($url);
        curl_multi_add_handle($mh, $ch);
        $handles[$key] = $ch;
    }
    $running = null;
    do {
        curl_multi_exec($mh, $running);
        curl_multi_select($mh);
    } while ($running > 0);

    $results = [];
    foreach ($handles as $key => $ch) {
        $results[$key] = curl_multi_getcontent($ch);
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    curl_multi_close($mh);
    return $results;
}

// 1) Récupérer la liste de tous les matchs
$listUrl = 'https://wcup2026.org/api/data.php?action=all&_=' . time();
$ch = fetchUrl($listUrl, 30);
$listRaw = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($listRaw === false || $httpCode < 200 || $httpCode >= 300) {
    error_log("Failed to fetch match list: HTTP $httpCode");
    exit(1);
}

$list = json_decode($listRaw, true);
if (!is_array($list) || !isset($list['matches']) || !is_array($list['matches'])) {
    error_log("Invalid match list payload");
    exit(1);
}

// 2) Construire la liste des IDs de matchs terminés ou en cours
$ids = [];
foreach ($list['matches'] as $match) {
    $status = strtolower($match['status'] ?? '');
    if ($status === 'finished' || $status === 'live' || $status === 'in_play') {
        $ids[] = intval($match['id']);
    }
}

if (empty($ids)) {
    echo "No finished/live matches to warm.\n";
    exit(0);
}

echo "Warming cache for " . count($ids) . " match(es)...\n";

// 3) Récupérer les détails en parallèle par lots de 20
$batches = array_chunk($ids, 20);
$warmed = 0;
foreach ($batches as $batch) {
    $urls = [];
    foreach ($batch as $id) {
        $urls[$id] = 'https://wcup2026.org/api/data.php?action=match&id=' . $id;
    }
    $results = fetchMulti($urls);
    foreach ($results as $id => $raw) {
        if ($raw === false || empty($raw)) {
            echo "  Match $id: empty response\n";
            continue;
        }
        $data = json_decode($raw, true);
        if (!is_array($data) || !isset($data['match']) || !is_array($data['match'])) {
            echo "  Match $id: invalid payload\n";
            continue;
        }
        $cacheFile = $cacheDir . '/wcup2026-match-' . $id . '.json';
        @file_put_contents($cacheFile, $raw);
        $warmed++;
    }
    echo "  Batch done, warmed $warmed / " . count($ids) . "\n";
}

echo "Done. Warmed $warmed match(es).\n";
