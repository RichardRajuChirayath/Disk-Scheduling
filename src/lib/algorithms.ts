export type DiskRequest = {
    id: string;
    cylinder: number;
    sector: number; // 0-359 degrees for simplicity
};

export type DiskResult = {
    sequence: number[];
    steps: DiskRequest[];
    totalSeekCount: number;
    averageSeekTime: number;
    totalRotationTime: number; // Theoretical ms
    totalOperationalTime: number; // Seek + Rotation
};

const SEEK_TIME_PER_TRACK = 2; // ms
const ROTATION_SPEED_MS = 8.33; // 7200 RPM -> 8.33ms per full rotation

const calculateRotationalDelay = (currentSector: number, targetSector: number): number => {
    let diff = targetSector - currentSector;
    if (diff < 0) diff += 360;
    return (diff / 360) * ROTATION_SPEED_MS;
};

export const calculateFCFS = (initialHead: number, reqs: DiskRequest[]): DiskResult => {
    let currentCyl = initialHead;
    let currentSec = 0;
    let seekCount = 0;
    let rotationTime = 0;
    const sequence = [initialHead];
    const steps: DiskRequest[] = [{ id: 'start', cylinder: initialHead, sector: 0 }];

    reqs.forEach(req => {
        seekCount += Math.abs(req.cylinder - currentCyl);
        rotationTime += calculateRotationalDelay(currentSec, req.sector);
        currentCyl = req.cylinder;
        currentSec = req.sector;
        sequence.push(currentCyl);
        steps.push(req);
    });

    const totalSeekTime = seekCount * SEEK_TIME_PER_TRACK;
    return {
        sequence,
        steps,
        totalSeekCount: seekCount,
        averageSeekTime: seekCount / Math.max(1, reqs.length),
        totalRotationTime: rotationTime,
        totalOperationalTime: totalSeekTime + rotationTime
    };
};

export const calculateSSTF = (initialHead: number, reqs: DiskRequest[]): DiskResult => {
    let currentCyl = initialHead;
    let currentSec = 0;
    let seekCount = 0;
    let rotationTime = 0;
    const sequence = [initialHead];
    const steps: DiskRequest[] = [{ id: 'start', cylinder: initialHead, sector: 0 }];
    const pending = [...reqs];

    while (pending.length > 0) {
        let closestIdx = 0;
        let minCylDist = Math.abs(pending[0].cylinder - currentCyl);

        for (let i = 1; i < pending.length; i++) {
            const dist = Math.abs(pending[i].cylinder - currentCyl);
            if (dist < minCylDist) {
                minCylDist = dist;
                closestIdx = i;
            }
        }

        const next = pending.splice(closestIdx, 1)[0];
        seekCount += minCylDist;
        rotationTime += calculateRotationalDelay(currentSec, next.sector);
        currentCyl = next.cylinder;
        currentSec = next.sector;
        sequence.push(currentCyl);
        steps.push(next);
    }

    const totalSeekTime = seekCount * SEEK_TIME_PER_TRACK;
    return {
        sequence,
        steps,
        totalSeekCount: seekCount,
        averageSeekTime: seekCount / Math.max(1, reqs.length),
        totalRotationTime: rotationTime,
        totalOperationalTime: totalSeekTime + rotationTime
    };
};

export const calculateSCAN = (initialHead: number, reqs: DiskRequest[], diskSize: number, direction: 'left' | 'right'): DiskResult => {
    let currentCyl = initialHead;
    let currentSec = 0;
    let seekCount = 0;
    let rotationTime = 0;
    const sequence = [initialHead];
    const steps: DiskRequest[] = [{ id: 'start', cylinder: initialHead, sector: 0 }];

    const left = reqs.filter(r => r.cylinder < initialHead).sort((a, b) => b.cylinder - a.cylinder);
    const right = reqs.filter(r => r.cylinder >= initialHead).sort((a, b) => a.cylinder - b.cylinder);

    const processQueue = (queue: DiskRequest[]) => {
        queue.forEach(req => {
            seekCount += Math.abs(req.cylinder - currentCyl);
            rotationTime += calculateRotationalDelay(currentSec, req.sector);
            currentCyl = req.cylinder;
            currentSec = req.sector;
            sequence.push(currentCyl);
            steps.push(req);
        });
    };

    if (direction === 'left') {
        processQueue(left);
        if (right.length > 0) {
            seekCount += currentCyl; // to 0
            currentCyl = 0;
            sequence.push(0);
            processQueue(right.sort((a, b) => a.cylinder - b.cylinder));
        }
    } else {
        processQueue(right);
        if (left.length > 0) {
            seekCount += (diskSize - 1) - currentCyl; // to end
            currentCyl = diskSize - 1;
            sequence.push(diskSize - 1);
            processQueue(left.sort((a, b) => b.cylinder - a.cylinder));
        }
    }

    return {
        sequence,
        steps,
        totalSeekCount: seekCount,
        averageSeekTime: seekCount / Math.max(1, reqs.length),
        totalRotationTime: rotationTime,
        totalOperationalTime: (seekCount * SEEK_TIME_PER_TRACK) + rotationTime
    };
};

export const calculateCSCAN = (initialHead: number, reqs: DiskRequest[], diskSize: number, direction: 'left' | 'right'): DiskResult => {
    let currentCyl = initialHead;
    let currentSec = 0;
    let seekCount = 0;
    let rotationTime = 0;
    const sequence = [initialHead];
    const steps: DiskRequest[] = [{ id: 'start', cylinder: initialHead, sector: 0 }];

    const sorted = [...reqs].sort((a, b) => a.cylinder - b.cylinder);

    if (direction === 'right') {
        const right = sorted.filter(r => r.cylinder >= initialHead);
        const left = sorted.filter(r => r.cylinder < initialHead);

        right.forEach(req => {
            seekCount += Math.abs(req.cylinder - currentCyl);
            rotationTime += calculateRotationalDelay(currentSec, req.sector);
            currentCyl = req.cylinder;
            currentSec = req.sector;
            sequence.push(currentCyl);
            steps.push(req);
        });

        if (left.length > 0) {
            seekCount += (diskSize - 1 - currentCyl) + (diskSize - 1); // to end then jump to 0
            currentCyl = 0;
            sequence.push(diskSize - 1);
            sequence.push(0);
            left.forEach(req => {
                seekCount += Math.abs(req.cylinder - currentCyl);
                rotationTime += calculateRotationalDelay(currentSec, req.sector);
                currentCyl = req.cylinder;
                currentSec = req.sector;
                sequence.push(currentCyl);
                steps.push(req);
            });
        }
    } else {
        const left = sorted.filter(r => r.cylinder <= initialHead).reverse();
        const right = sorted.filter(r => r.cylinder > initialHead).reverse();

        left.forEach(req => {
            seekCount += Math.abs(req.cylinder - currentCyl);
            rotationTime += calculateRotationalDelay(currentSec, req.sector);
            currentCyl = req.cylinder;
            currentSec = req.sector;
            sequence.push(currentCyl);
            steps.push(req);
        });

        if (right.length > 0) {
            seekCount += currentCyl + (diskSize - 1); // to 0 then jump to end
            currentCyl = diskSize - 1;
            sequence.push(0);
            sequence.push(diskSize - 1);
            right.forEach(req => {
                seekCount += Math.abs(req.cylinder - currentCyl);
                rotationTime += calculateRotationalDelay(currentSec, req.sector);
                currentCyl = req.cylinder;
                currentSec = req.sector;
                sequence.push(currentCyl);
                steps.push(req);
            });
        }
    }

    return {
        sequence,
        steps,
        totalSeekCount: seekCount,
        averageSeekTime: seekCount / Math.max(1, reqs.length),
        totalRotationTime: rotationTime,
        totalOperationalTime: (seekCount * SEEK_TIME_PER_TRACK) + rotationTime
    };
};

export const calculateLOOK = (initialHead: number, reqs: DiskRequest[], direction: 'left' | 'right'): DiskResult => {
    let currentCyl = initialHead;
    let currentSec = 0;
    let seekCount = 0;
    let rotationTime = 0;
    const sequence = [initialHead];
    const steps: DiskRequest[] = [{ id: 'start', cylinder: initialHead, sector: 0 }];

    const left = reqs.filter(r => r.cylinder < initialHead).sort((a, b) => b.cylinder - a.cylinder);
    const right = reqs.filter(r => r.cylinder >= initialHead).sort((a, b) => a.cylinder - b.cylinder);

    const processQueue = (queue: DiskRequest[]) => {
        queue.forEach(req => {
            seekCount += Math.abs(req.cylinder - currentCyl);
            rotationTime += calculateRotationalDelay(currentSec, req.sector);
            currentCyl = req.cylinder;
            currentSec = req.sector;
            sequence.push(currentCyl);
            steps.push(req);
        });
    };

    if (direction === 'left') {
        processQueue(left);
        processQueue(right);
    } else {
        processQueue(right);
        processQueue(left);
    }

    return {
        sequence,
        steps,
        totalSeekCount: seekCount,
        averageSeekTime: seekCount / Math.max(1, reqs.length),
        totalRotationTime: rotationTime,
        totalOperationalTime: (seekCount * SEEK_TIME_PER_TRACK) + rotationTime
    };
};

export const calculateCLOOK = (initialHead: number, reqs: DiskRequest[], direction: 'left' | 'right'): DiskResult => {
    let currentCyl = initialHead;
    let currentSec = 0;
    let seekCount = 0;
    let rotationTime = 0;
    const sequence = [initialHead];
    const steps: DiskRequest[] = [{ id: 'start', cylinder: initialHead, sector: 0 }];

    const sorted = [...reqs].sort((a, b) => a.cylinder - b.cylinder);

    if (direction === 'right') {
        const right = sorted.filter(r => r.cylinder >= initialHead);
        const left = sorted.filter(r => r.cylinder < initialHead);

        right.forEach(req => {
            seekCount += Math.abs(req.cylinder - currentCyl);
            rotationTime += calculateRotationalDelay(currentSec, req.sector);
            currentCyl = req.cylinder;
            currentSec = req.sector;
            sequence.push(currentCyl);
            steps.push(req);
        });

        if (left.length > 0) {
            sequence.push(left[0].cylinder);
            left.forEach(req => {
                seekCount += Math.abs(req.cylinder - currentCyl);
                rotationTime += calculateRotationalDelay(currentSec, req.sector);
                currentCyl = req.cylinder;
                currentSec = req.sector;
                sequence.push(currentCyl);
                steps.push(req);
            });
        }
    } else {
        const left = sorted.filter(r => r.cylinder <= initialHead).reverse();
        const right = sorted.filter(r => r.cylinder > initialHead).reverse();

        left.forEach(req => {
            seekCount += Math.abs(req.cylinder - currentCyl);
            rotationTime += calculateRotationalDelay(currentSec, req.sector);
            currentCyl = req.cylinder;
            currentSec = req.sector;
            sequence.push(currentCyl);
            steps.push(req);
        });

        if (right.length > 0) {
            sequence.push(right[0].cylinder);
            right.forEach(req => {
                seekCount += Math.abs(req.cylinder - currentCyl);
                rotationTime += calculateRotationalDelay(currentSec, req.sector);
                currentCyl = req.cylinder;
                currentSec = req.sector;
                sequence.push(currentCyl);
                steps.push(req);
            });
        }
    }

    return {
        sequence,
        steps,
        totalSeekCount: seekCount,
        averageSeekTime: seekCount / Math.max(1, reqs.length),
        totalRotationTime: rotationTime,
        totalOperationalTime: (seekCount * SEEK_TIME_PER_TRACK) + rotationTime
    };
};
