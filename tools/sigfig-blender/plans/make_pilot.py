"""Rebel / TIE pilot: relaxed pose (one hand on the hip, a foot tapping), the other hand spins the helmet, tosses it, it lands on the head
(the hair piece hides), a pause, then he takes it off and goes back to the start. 15 s loop.

    (Blender)  FIG = 'rebel-pilot'; exec(open(BASE + 'plans/solve_pilot.py').read())     # the rim grip, the spin axis, the arm pose, the free arm  -> <fig>-solve.json
    (Blender)  FIG = 'rebel-pilot'; exec(open(BASE + 'plans/seat_pilot.py').read())      # where the helmet sits on the head                       -> <fig>-seat.json
    python3 make_pilot.py rebel m1 > rebel-pilot-m1.json                                 # helmet at the hand, then at the seat: nothing else
    (Blender)  FIG = 'rebel-pilot'; STAGE = 'm1'; exec(open(BASE + 'plans/measure_pilot.py').read())    # the helmet's pose at the release and at the landing -> <fig>-measure.json
    python3 make_pilot.py rebel m2 > rebel-pilot-m2.json                                 # the whole motion, the hair always shown
    (Blender)  FIG = 'rebel-pilot'; STAGE = 'm2'; exec(open(BASE + 'plans/measure_pilot.py').read())    # clipping scan of every frame, the frames the hair hides / shows on
    python3 make_pilot.py rebel > rebel-pilot.json                                       # the plan
    (same for tie)

The helmet is held by its rim in the hand's clip (the grip, found by search, is turned so that its body lies away from the arm) and spins about its own axis, so the
rim slides through the clip and nothing sweeps through the arm. It is tossed along a ballistic arc that starts at the pose it has in the hand at the release and ends
at the pose it has on the head, with a somersault in between. The hair piece is cut out and back in between one frame and the next, when the helmet meets or leaves it."""
import json, math, os, sys
from motionlib import *
from physlib import qmul, qinv, qslerp, qaxis, qeuler_xyz

HERE = os.path.dirname(os.path.abspath(__file__))
KEY = sys.argv[1] if len(sys.argv) > 1 else 'rebel'
MODE = sys.argv[2] if len(sys.argv) > 2 else 'final'            # m1: measure the release / landing poses; m2: whole motion with the hair shown; final
NAME = KEY + '-pilot'
SOL = json.load(open(os.path.join(HERE, NAME + '-solve.json')))
SEAT = json.load(open(os.path.join(HERE, NAME + '-seat.json')))
MEAS = json.load(open(os.path.join(HERE, NAME + '-measure.json'))) if MODE != 'm1' else {}
CARRY = json.load(open(os.path.join(HERE, NAME + '-carry.json')))['arm'] if MODE != 'm1' else [-103, 4.5, 7.5]       # the arm pose that holds the helmet clear of the head after it is taken off

T = 15.0
FPS = 24
if KEY == 'rebel':
    side, helmet, other = 'r', 'acc_x164px2', 'l'
else:
    side, helmet, other = 'l', 'acc_30408p02', 'r'
m = 1 if side == 'r' else -1            # mirror: +1 when the helmet hand is the figure's right
HAIR = 'acc_23186'
T_SPIN0, T_SPIN1 = 1.0, 6.0
T_WIND = 6.2
F_REL, F_LAND = 171, 202                # the frames the helmet leaves the hand and arrives on the head
T_REL, T_LAND = F_REL / FPS, F_LAND / FPS
T_OFF0, T_OFF1 = 10.6, 11.8
ARM_OUT = SOL['arm_out']
ARM_UP = SOL['arm_up']                  # the helmet arm is raised this far forward while the helmet spins, so the forearm stays out of the helmet's swing
TWIST = SOL['twist']                    # and the hand turned this much about its pin, which stands the spin axis up

# spin: rev/s profile, scaled so the helmet ends exactly on a whole number of turns
def speed(t):
    return 430.0 * win(t, T_SPIN0, T_SPIN1, 0.7)
_A = sum(speed(i / 240.0) for i in range(int(T * 240))) / 240.0
_K = 360.0 * round(_A / 360.0) / _A
def spin_deg(t):
    n = int(t * 240)
    return _K * sum(speed(i / 240.0) for i in range(n)) / 240.0
spin_keys = [dict(t=round(i / 12.0, 4), deg=round(spin_deg(i / 12.0), 3)) for i in range(0, int(T * 12) + 1)]

def helm_arm_x(t):
    return pulse(t, [(0, 0), (0.4, 0), (T_SPIN0, -ARM_UP), (T_WIND, -ARM_UP), (6.75, 31), (7.0, -60), (T_REL + 0.05, -105), (7.8, -118), (8.6, -12), (9.0, 6), (10.4, 6),
                     (10.95, CARRY[0]), (11.8, CARRY[0]), (12.8, 0), (T, 0)])
# extra swing of the upper arm on the throw / as it comes down after carrying the helmet, so the big TIE helmet passes the head instead of through it (found by scanning
# the frames for clipping: the other direction is far worse); env overrides for that scan
THROW_OUT, LOWER_OUT = (float(os.environ.get('PILOT_THROW', -20.0 if KEY == 'tie' else 0.0)), float(os.environ.get('PILOT_LOWER', -25.0 if KEY == 'tie' else 0.0)))
def helm_arm_y(t):
    return m * (pulse(t, [(0, 0), (0.4, 0), (T_SPIN0, ARM_OUT), (T_WIND, ARM_OUT), (6.75, 2), (7.1, -3), (8.6, 0), (10.4, 0), (10.95, CARRY[1]), (11.8, CARRY[1]), (12.8, 0), (T, 0)])
                + THROW_OUT * pulse(t, [(6.4, 0), (6.75, 1), (7.2, 1), (7.9, 0)]) + LOWER_OUT * pulse(t, [(11.8, 0), (12.2, 1), (12.8, 0)]))
def helm_arm_z(t):
    return m * pulse(t, [(0, 0), (T_WIND, 0), (6.75, 1.7), (7.1, 22), (7.8, 22), (8.6, 0), (10.4, 0), (10.95, CARRY[2]), (11.8, CARRY[2]), (12.8, 0), (T, 0)])
def helm_hand_y(t):                       # the hand's twist about its pin while the helmet is held up and spun
    return TWIST * pulse(t, [(0, 0), (0.4, 0), (T_SPIN0, 1), (T_WIND, 1), (6.75, 0), (T, 0)])

HIP = SOL['hip_keys']                     # the free arm: hand on the hip, angled out (solved), a breath of movement on top
def hip_arm_y(t):
    return HIP[1] + 0.6 * math.sin(2 * math.pi * t / T * 3)

def tap(t):                               # foot tap: a toe-down pulse about 2 per second, only while he is relaxed
    on = win(t, 0.4, 6.4, 0.5) + win(t, 12.6, 14.8, 0.5)
    ph = (t * 2.0) % 1.0
    return -9 * on * (math.sin(math.pi * ph) ** 2)

def head_x(t):
    return 8 * win(t, 1.0, 6.0, 0.8) - 20 * win(t, 7.1, 8.2, 0.3) + 4 * win(t, 8.5, 12.8, 0.4) - 4 * win(t, 10.6, 11.7, 0.3)
GLANCE = float(os.environ.get('PILOT_GLANCE', 14.0))      # how far the head turns to watch the spinning helmet
def head_z(t):                            # glances at the helmet, then proudly around while it sits on his head
    return (-m) * (GLANCE * win(t, 1.0, 6.0, 0.8) + 8 * win(t, 6.8, 8.0, 0.3)) + 10 * pulse(t, [(8.8, 0), (9.3, 1), (9.9, -0.8), (10.4, 0)]) * win(t, 8.6, 10.5, 0.2)
def torso_z(t):
    return (-m) * (6 * win(t, 1.0, 6.0, 0.8) + 8 * win(t, 6.6, 7.6, 0.2) + 6 * win(t, 10.7, 11.9, 0.3))
def torso_x(t):
    return 2 + 1.0 * math.sin(2 * math.pi * t / T * 4) - 8 * win(t, 6.4, 6.9, 0.15) + 6 * win(t, 7.0, 7.5, 0.15)

# ---- helmet: in the hand (the searched rim grip), spins about its own axis, is tossed (world path anchored at the release pose), lands on the head,
# is lifted off, back in the hand
hand_follow = dict(to='hand_' + side, rel=SOL['rel_hold'])
head_follow = dict(to='head', bone='head_3', off=SEAT['off'], rot=SEAT['rot'])
if MODE == 'm1':
    helmet_free = dict(part=helmet, follow=[hand_follow, head_follow], mix=[[0, 0, 0, 1, 0], [8.0, 0, 0, 1, 0], [8.01, 0, 0, 0, 1], [T, 0, 0, 0, 1]])
else:
    bl, bq = MEAS['base_loc'], tuple(MEAS['base_q'])        # the helmet's world pose in the hand at the release
    sl, sq = MEAS['seat_loc'], tuple(MEAS['seat_q'])        # and on the head at the landing
    D = (F_LAND - F_REL) / FPS
    dxyz = [sl[i] - bl[i] for i in range(3)]
    rres = qmul(sq, qinv(bq))                                # what is left to turn, in world axes, after the somersault: dq @ base = seat
    APEX = max(0.80, dxyz[2] + 0.45)                         # the top of the arc, above the release point
    tau_a = D / (1 + math.sqrt((APEX - dxyz[2]) / APEX))
    kg = APEX / tau_a ** 2
    toss = []
    for f in range(F_REL, F_LAND + 1):
        tau = (f - F_REL) / FPS
        s = tau / D
        fr = 1 - (1 - s) ** 2                                # the somersault eases out as it comes in to land
        dq = qmul(qaxis((1, 0, 0), -360.0 * fr), qslerp((1, 0, 0, 0), rres, fr))
        toss.append(dict(t=round(f / FPS, 5), off=[round(dxyz[0] * s, 5), round(dxyz[1] * s, 5), round(APEX - kg * (tau - tau_a) ** 2, 5)],
                         rot=[round(v, 3) for v in qeuler_xyz(dq)]))
    bump = [dict(t=T_OFF0, off=[0, 0, 0]), dict(t=T_OFF0 + 0.35, off=[0, 0, 0.30]), dict(t=T_OFF0 + 0.8, off=[0, 0, 0.28]), dict(t=T_OFF1, off=[0, 0, 0])]
    helmet_free = dict(
        part=helmet, keys=toss, anchor=T_REL - 0.01, anchor_follow=0, bump=bump,
        spin=dict(axis=SOL['axis_hand'], pivot=SOL['spin_pivot_hand'], **{'in': 'hand_' + side}, keys=spin_keys),
        follow=[hand_follow, head_follow],
        mix=[[0, 0, 0, 1, 0], [T_REL - 0.01, 0, 0, 1, 0], [T_REL + 0.01, 0, 1, 0, 0], [T_LAND - 0.15, 0, 1, 0, 0], [T_LAND + 0.15, 0, 0, 0, 1],
             [T_OFF0, 0, 0, 0, 1], [T_OFF0 + 0.3, 0, 0, 0, 1], [T_OFF1, 0, 0, 1, 0], [T, 0, 0, 1, 0]])      # up and clear of the head first, then over to the hand

free = [helmet_free]
if MODE == 'final':
    # the hair piece: out the frame the helmet meets it, back the frame the helmet leaves it (the frames come from the clipping scan)
    f_hide, f_show = MEAS['hair_hide_f'], MEAS['hair_show_f']
    free.append(dict(part=HAIR, keys=[dict(t=round(f / FPS, 5), scale=(0.0001 if f_hide <= f < f_show else 1.0)) for f in range(int(T * FPS) + 1)], mix=[[0, 1, 0]]))

plan = dict(
    duration=T, fps=FPS,
    description="Relaxed pose, one hand on the hip, a foot tapping; the other hand spins the helmet, tosses it up and it lands on the head (hair hides); he waits a couple of seconds, takes it off and goes back to the start. 15 s loop.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    pivots_local={'hand_r': [0, -0.04, -0.005], 'hand_l': [0, -0.04, -0.005]},
    keys={
        'arm_' + side: {'rotation_x': dense(helm_arm_x, T), 'rotation_y': dense(helm_arm_y, T), 'rotation_z': dense(helm_arm_z, T)},
        'hand_' + side: {'rotation_y': dense(helm_hand_y, T, 2)},
        'arm_' + other: {'rotation_x': [[0, HIP[0]]], 'rotation_y': dense(hip_arm_y, T, 4), 'rotation_z': [[0, HIP[2]]]},
        'hand_' + other: {'rotation_x': [[0, HIP[3]]], 'rotation_y': [[0, HIP[4]]], 'rotation_z': [[0, HIP[5]]]},
        'leg_' + side: {'rotation_x': dense(tap, T)},
        'head': {'rotation_x': dense(head_x, T, 2), 'rotation_z': dense(head_z, T, 2)},
        'torso': {'rotation_z': dense(torso_z, T, 2), 'rotation_x': dense(torso_x, T, 2)},
    },
    free=free,
)
print(json.dumps(plan))
