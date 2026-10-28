"""Rebel / TIE pilot: relaxed pose (one hand on the hip, a foot tapping) with the helmet in the other hand; it ends up on his head (the hair piece hides), a pause,
he takes it off and is back at the start. 15 s loop.
  rebel: the helmet hops from the rim grip onto his fingertips (the hand up inside its cavity, the fingers in the anti-stud under the crown) and spins there,
         then he tosses it up and it lands on his head.
  TIE:   he dribbles the helmet like a basketball, upside down (crown on the floor), passing it from hand to hand, patting the rim; the last bounce sends it
         high and it comes down on his head, the right way up.
On the head the helmet sits as LDraw headgear does: in the hair piece's place, the head's stud in its anti-stud.

    (Blender)  FIG = 'rebel-pilot'; exec(open(BASE + 'plans/solve_pilot.py').read())     # rim grip (rebel), the imported grip (rel_rim), the free arm's hip pose
    (Blender)  FIG = 'rebel-pilot'; exec(open(BASE + 'plans/stud_pilot.py').read())      # anti-stud / stud: the seat and the fingertip relation -> <fig>-stud.json
    (Blender)  FIG = 'rebel-pilot'; exec(open(BASE + 'plans/tip_pilot.py').read())       # rebel only: the arm pose with the fingers up in the helmet -> <fig>-tip.json
    python3 make_pilot.py rebel m1 > rebel-pilot-m1.json
    (Blender)  FIG = 'rebel-pilot'; STAGE = 'm1'; exec(open(BASE + 'plans/measure_pilot.py').read())    # poses at named frames (+ the TIE's fingertip path)
    (Blender)  FIG = 'rebel-pilot'; exec(open(BASE + 'plans/carry_pilot.py').read())     # the arm pose that carries it clear of the head after it comes off
    python3 make_pilot.py rebel m2 > rebel-pilot-m2.json
    (Blender)  FIG = 'rebel-pilot'; STAGE = 'm2'; exec(open(BASE + 'plans/measure_pilot.py').read())    # clipping scan, the hair's cut frames
    python3 make_pilot.py rebel > rebel-pilot.json
    (same for tie)"""
import json, math, os, sys
from motionlib import *
from physlib import qmul, qinv, qslerp, qaxis, qeuler_xyz

HERE = os.path.dirname(os.path.abspath(__file__))
KEY = sys.argv[1] if len(sys.argv) > 1 else 'rebel'
MODE = sys.argv[2] if len(sys.argv) > 2 else 'final'            # m1: measure poses; m2: whole motion with the hair shown; final
NAME = KEY + '-pilot'
J = lambda suffix: json.load(open(os.path.join(HERE, NAME + suffix)))
SOL, STUD = J('-solve.json'), J('-stud.json')
MEAS = J('-measure.json') if MODE != 'm1' else {}
CARRY = J('-carry.json')['arm'] if MODE != 'm1' else [-85.0, 0.0, 30.0]
REBEL = KEY == 'rebel'

T = 15.0
FPS = 24
if REBEL:
    side, helmet, other = 'r', 'acc_x164px2', 'l'
else:
    side, helmet, other = 'l', 'acc_30408p02', 'r'
m = 1 if side == 'r' else -1            # mirror: +1 when the helmet hand is the figure's right
HAIR = 'acc_23186'
T_OFF0, T_OFF1 = 10.6, 11.8             # the helmet comes off the head into the hand
HIP = SOL['hip_keys']                   # the free arm: hand on the hip, angled out (solved), a breath of movement on top

def hip_arm_y(t): return HIP[1] + 0.6 * math.sin(2 * math.pi * t / T * 3)
def tap(t):                               # foot tap: a toe-down pulse about 2 per second, only while he is relaxed
    on = (win(t, 0.4, 6.0, 0.5) if REBEL else win(t, 0.2, 0.9, 0.3)) + win(t, 12.6, 14.8, 0.5)
    return -9 * on * (math.sin(math.pi * ((t * 2.0) % 1.0)) ** 2)

hold_follow = dict(to='hand_' + side, rel=SOL['rel_hold']) if REBEL else dict(to='hand_' + side)     # the rebel's searched rim grip; the TIE's imported one
head_follow = dict(to='head', bone='head_3', like=HAIR)                                             # worn as the hair piece is: stud in the anti-stud

def world_key(t, P, Q, rest):
    """A WORLD key for an absolute pose: offset from the helmet's rest position and the turn on top of its rest orientation."""
    return dict(t=round(t, 5), off=[round(P[i] - rest[0][i], 5) for i in range(3)], rot=[round(v, 3) for v in qeuler_xyz(qmul(Q, qinv(rest[1])))])

if REBEL:
    TIP = J('-tip.json')['keys6']                                     # the arm with the fingers up inside the helmet
    T_UP0, T_UP1 = 0.5, 1.3                                           # the arm comes up and the helmet hops onto the fingertips
    T_SPIN0, T_SPIN1, T_WIND = 1.5, 6.0, 6.2
    F_REL, F_LAND = 171, 202
    T_REL, T_LAND = F_REL / FPS, F_LAND / FPS

    def speed(t): return 430.0 * win(t, T_SPIN0, T_SPIN1, 0.7)
    _A = sum(speed(i / 240.0) for i in range(int(T * 240))) / 240.0
    _K = 360.0 * round(_A / 360.0) / _A
    def spin_deg(t): return _K * sum(speed(i / 240.0) for i in range(int(t * 240))) / 240.0
    spin_keys = [dict(t=round(i / 12.0, 4), deg=round(spin_deg(i / 12.0), 3)) for i in range(0, int(T * 12) + 1)]

    def up(t): return pulse(t, [(T_UP0, 0), (T_UP1, 1), (T_REL + 0.25, 1), (8.4, 0), (T, 0)])     # how much of the fingers-up pose
    def flick(t): return pulse(t, [(T_WIND, 0), (6.75, 14), (T_REL, -30), (T_REL + 0.3, -22), (8.4, 0)])   # dip, then flick it up off the fingers
    def helm_arm(i):
        after = {0: [(0, 0), (8.6, -12), (9.0, 6), (10.4, 6), (10.95, CARRY[0]), (11.8, CARRY[0]), (12.8, 0), (T, 0)],
                 1: [(0, 0), (10.4, 0), (10.95, m * CARRY[1]), (11.8, m * CARRY[1]), (12.8, 0), (T, 0)],
                 2: [(0, 0), (10.4, 0), (10.95, m * CARRY[2]), (11.8, m * CARRY[2]), (12.8, 0), (T, 0)]}[i]
        return lambda t: up(t) * (TIP[i] + (flick(t) if i == 0 else 0.0) + circle(t, i)) + (1 - up(t)) * pulse(t, after)
    def circle(t, i):                     # the arm waves the spinning helmet round a small circle, about once a second
        a = 2 * math.pi * 1.1 * (t - T_SPIN0)
        e = win(t, T_SPIN0, T_SPIN1, 0.6)
        return e * 7.0 * (math.sin(a) if i == 0 else (m * math.cos(a) if i == 1 else 0.0))
    def helm_hand(i): return lambda t: up(t) * TIP[3 + i]
    def head_x(t): return 6 * win(t, 1.0, 6.0, 0.8) - 20 * win(t, 7.1, 8.2, 0.3) + 4 * win(t, 8.5, 12.8, 0.4) - 4 * win(t, 10.6, 11.7, 0.3)
    def head_z(t): return (-m) * (12 * win(t, 1.0, 6.0, 0.8) + 8 * win(t, 6.8, 8.0, 0.3)) + 10 * pulse(t, [(8.8, 0), (9.3, 1), (9.9, -0.8), (10.4, 0)]) * win(t, 8.6, 10.5, 0.2)
    def torso_z(t): return (-m) * (5 * win(t, 1.0, 6.0, 0.8) + 8 * win(t, 6.6, 7.6, 0.2) + 6 * win(t, 10.7, 11.9, 0.3))
    def torso_x(t): return 2 + 1.0 * math.sin(2 * math.pi * t / T * 4) - 8 * win(t, 6.4, 6.9, 0.15) + 6 * win(t, 7.0, 7.5, 0.15)

    tip_follow = dict(to='hand_' + side, rel=STUD['rel_tip'])
    meta = dict(frames=dict(rest=0, rel=F_REL, land=F_LAND))
    if MODE == 'm1':
        helmet_free = dict(part=helmet, follow=[hold_follow, tip_follow, head_follow],
                           mix=[[0, 0, 0, 1, 0, 0], [0.9, 0, 0, 1, 0, 0], [1.25, 0, 0, 0, 1, 0], [8.0, 0, 0, 0, 1, 0], [8.01, 0, 0, 0, 0, 1], [T, 0, 0, 0, 0, 1]])
    else:
        bl, bq = MEAS['rel_loc'], tuple(MEAS['rel_q'])               # on the fingertips at the release
        sl, sq = MEAS['land_loc'], tuple(MEAS['land_q'])             # on the head at the landing
        D = (F_LAND - F_REL) / FPS
        dxyz = [sl[i] - bl[i] for i in range(3)]
        rres = qmul(sq, qinv(bq))
        APEX = max(0.80, dxyz[2] + 0.45)
        tau_a = D / (1 + math.sqrt((APEX - dxyz[2]) / APEX))
        kg = APEX / tau_a ** 2
        toss = []
        for f in range(F_REL, F_LAND + 1):
            tau = (f - F_REL) / FPS
            s = tau / D
            fr = 1 - (1 - s) ** 2
            dq = qmul(qaxis((1, 0, 0), -360.0 * fr), qslerp((1, 0, 0, 0), rres, fr))
            toss.append(dict(t=round(f / FPS, 5), off=[round(dxyz[0] * s, 5), round(dxyz[1] * s, 5), round(APEX - kg * (tau - tau_a) ** 2, 5)], rot=[round(v, 3) for v in qeuler_xyz(dq)]))
        bump = [dict(t=0.9, off=[0, 0, 0]), dict(t=1.08, off=[0, 0, 0.12]), dict(t=1.25, off=[0, 0, 0]), dict(t=1.45, off=[0, 0, 0]),   # the hop onto the fingers
                dict(t=T_OFF0 - 0.2, off=[0, 0, 0]),                     # held flat in between: a long spline span between two zeros sagged 4 cm and crept back
                dict(t=T_OFF0, off=[0, 0, 0]), dict(t=T_OFF0 + 0.35, off=[0, 0, 0.30]), dict(t=T_OFF0 + 0.8, off=[0, 0, 0.28]), dict(t=T_OFF1, off=[0, 0, 0])]
        helmet_free = dict(
            part=helmet, keys=toss, anchor=T_REL - 0.01, anchor_follow=1, bump=bump,
            spin=dict(axis=STUD['tip_axis_hand'], pivot=STUD['tip_pivot_hand'], keys=spin_keys, **{'in': 'hand_' + side}),
            follow=[hold_follow, tip_follow, head_follow],
            mix=[[0, 0, 0, 1, 0, 0], [0.9, 0, 0, 1, 0, 0], [1.25, 0, 0, 0, 1, 0], [T_REL - 0.01, 0, 0, 0, 1, 0], [T_REL + 0.01, 0, 1, 0, 0, 0],
                 [T_LAND - 0.15, 0, 1, 0, 0, 0], [T_LAND + 0.15, 0, 0, 0, 0, 1], [T_OFF0, 0, 0, 0, 0, 1], [T_OFF0 + 0.3, 0, 0, 0, 0, 1], [T_OFF1, 0, 0, 1, 0, 0], [T, 0, 0, 1, 0, 0]])
else:
    # ---- the TIE's dribble: upside down (crown on the floor, rim up), passed from hand to hand: the left hand drops it, it bounces across to the right
    # hand, which pats it back across to the left, and so on; the last bounce sends it up and it comes down on his head the right way up
    T_D0 = 1.2                                                        # the helmet leaves the (left) hand
    P = 0.7                                                           # one bounce, hand to hand
    NB = 6                                                            # tops after the drop: right, left, right, left, right, left
    T_LAST = T_D0 + NB * P
    T_KICK = T_LAST + P / 2                                           # the last floor bounce: this one sends it up
    F_D0, F_KICK = int(round(T_D0 * FPS)), int(round(T_KICK * FPS))
    F_LAND = 178
    T_LAND = F_LAND / FPS
    # the patting poses (arm x, y, z), found by sweeping each arm in Blender: the fingertips about 0.43 m out to that side, 0.22 m forward, 0.6 m up
    PAT = {side: (-15.0, 45.0, 40.0), other: (-25.0, 45.0, -20.0)}
    def dribbling(t): return win(t, T_D0 - 0.4, T_LAST + 0.25, 0.35)
    def first_top(s): return T_D0 + (2 * P if s == side else P)    # the right hand meets it first
    def pat(s, t):
        """How far the hand is raised (degrees of arm swing) for its stroke: it rises to meet the helmet, slaps it down and follows through hard, then
        comes back up and waits for the helmet to return (one stroke every other bounce)."""
        ph_ = ((t - first_top(s)) % (2 * P)) / (2 * P)
        return pulse(ph_, [(0.0, 22.0), (0.10, -16.0), (0.22, -12.0), (0.55, 4.0), (0.85, 14.0), (1.0, 22.0)])
    def pat_side(s, t):                   # and swings a little across as it pushes the helmet over to the other hand
        ph_ = ((t - first_top(s)) % (2 * P)) / (2 * P)
        return pulse(ph_, [(0.0, 0.0), (0.12, -10.0), (0.4, -4.0), (1.0, 0.0)])
    def helm_arm(i):
        rest = {0: [(0, 0), (0.6, 0), (T_KICK, 0), (T_KICK + 0.35, -105), (T_KICK + 0.9, -60), (T_LAND + 0.4, 0), (10.4, 0), (10.95, CARRY[0]), (11.8, CARRY[0]), (12.8, 0), (T, 0)],
                1: [(0, 0), (10.4, 0), (10.95, m * CARRY[1]), (11.8, m * CARRY[1]), (12.8, 0), (T, 0)],
                2: [(0, 0), (10.4, 0), (10.95, m * CARRY[2]), (11.8, m * CARRY[2]), (12.8, 0), (T, 0)]}[i]
        return lambda t: dribbling(t) * (PAT[side][i] - (pat(side, t) if i == 0 else 0.0) + (pat_side(side, t) if i == 1 else 0.0)) + (1 - dribbling(t)) * pulse(t, rest)
    def other_arm(i, base):               # the free arm leaves the hip to pat, then goes back
        return lambda t: dribbling(t) * (PAT[other][i] - (pat(other, t) if i == 0 else 0.0) - (pat_side(other, t) if i == 1 else 0.0)) + (1 - dribbling(t)) * base(t)
    def helm_hand(i): return lambda t: 0.0
    def head_x(t): return 14 * win(t, 0.9, T_KICK + 0.1, 0.4) - 22 * win(t, T_KICK + 0.1, T_LAND - 0.1, 0.25) + 4 * win(t, T_LAND + 0.2, 12.8, 0.4) - 4 * win(t, 10.6, 11.7, 0.3)
    def head_z(t):                        # follows the helmet from hand to hand
        return 12 * math.cos(math.pi * (t - T_D0) / P) * dribbling(t) * m + 10 * pulse(t, [(8.8, 0), (9.3, 1), (9.9, -0.8), (10.4, 0)]) * win(t, 8.6, 10.5, 0.2)
    def torso_z(t): return 5 * math.cos(math.pi * (t - T_D0) / P) * dribbling(t) * m + (-m) * 6 * win(t, 10.7, 11.9, 0.3)
    def torso_x(t): return 2 + 8 * win(t, 0.9, T_KICK, 0.5) + 2.0 * math.sin(2 * math.pi * (t - T_D0) / P) * dribbling(t) - 6 * win(t, T_KICK, T_KICK + 0.6, 0.15)
    meta = dict(frames=dict(rest=0, rel=F_D0, land=F_LAND), tip_frames=[F_D0, F_KICK], tip_hands=[side, other])
    if MODE == 'm1':
        helmet_free = dict(part=helmet, follow=[hold_follow, head_follow], mix=[[0, 0, 0, 1, 0], [6.5, 0, 0, 1, 0], [6.51, 0, 0, 0, 1], [T, 0, 0, 0, 1]])
    else:
        rest = (MEAS['rest_loc'], tuple(MEAS['rest_q']))             # the helmet's imported pose (WORLD keys are relative to it)
        ql = tuple(MEAS['land_q'])                                    # upright as on the head: crown up, face forward
        qf = qmul(qaxis((1, 0, 0), 180.0), ql)                        # upside down: crown on the floor, rim up
        TOP, RIM = STUD['top_z'], STUD['rim_z']
        tips = {s_: MEAS['tips_' + s_] for s_ in (side, other)}
        tip = lambda s_, t: tips[s_][max(0, min(len(tips[s_]) - 1, int(round(t * FPS)) - MEAS['tip_from']))]
        FLOOR_Z = TOP + 0.002                                          # the origin's height with the crown on the floor
        RIM_UP = -RIM + 0.004                                          # the rim's height above the origin, upside down
        rel_l, rel_q = MEAS['rel_loc'], tuple(MEAS['rel_q'])
        rel_c = MEAS['land_loc']                                       # his middle (the seat is over his head)
        RIM_EDGE = 0.15                                                # the helmet's middle sits this far beyond the hand
        def top_at(k):
            if k == 0:
                return rel_l
            s_ = other if k % 2 == 1 else side
            tp = tip(s_, T_D0 + k * P)
            ox, oy = tp[0] - rel_c[0], tp[1] - rel_c[1]               # outward from his middle, through the hand
            n_ = math.hypot(ox, oy) or 1.0
            # the hand pats the near edge of the rim (not the middle of the opening, where the forearm would go into the helmet)
            return [tp[0] + ox / n_ * RIM_EDGE, tp[1] + oy / n_ * RIM_EDGE, tp[2] - RIM_UP]
        def drib(t):
            """(position, orientation): the rim meets a hand at T_D0 + kP (alternately right / left), the crown hits the floor half way, out in front of him."""
            k = min(NB, int((t - T_D0) // P))
            u = (t - T_D0 - k * P) / P
            a, b_ = top_at(k), top_at(min(NB, k + 1)) if k < NB else top_at(NB)
            if k >= NB:                                               # after the last pat: down to the floor in front, then the kick
                b_ = [a[0] * 0.5, a[1] - 0.12, a[2]]
            mid = [(a[0] + b_[0]) / 2, min(a[1], b_[1]) - 0.12]        # the floor spot: between the hands and a little further out in front
            h = abs(math.cos(math.pi * u))                             # 1 at the tops, 0 (the bounce, a cusp) on the floor
            if u < 0.5:
                w = u * 2
                xy = [a[0] + (mid[0] - a[0]) * w, a[1] + (mid[1] - a[1]) * w]
                ztop = a[2]
            else:
                w = (u - 0.5) * 2
                xy = [mid[0] + (b_[0] - mid[0]) * w, mid[1] + (b_[1] - mid[1]) * w]
                ztop = b_[2]
            pos = [xy[0], xy[1], FLOOR_Z + (ztop - FLOOR_Z) * h]
            # it tumbles: a steady turn about the vertical (a third of a turn a bounce), and a tip of up to 40 degrees toward where it is going, most at
            # the floor and level again at each hand, so the rim always comes up flat under the next pat
            dx_, dy_ = b_[0] - a[0], b_[1] - a[1]
            n_ = math.hypot(dx_, dy_) or 1.0
            tip_ax = (-dy_ / n_, dx_ / n_, 0.0)
            tumble = qmul(qaxis(tip_ax, 40.0 * math.sin(math.pi * u)), qaxis((0, 0, 1), 120.0 * (t - T_D0) / P))
            base_q = qslerp(rel_q, qf, min(1.0, (t - T_D0) / (P / 2))) if k == 0 else qf       # flips over on the way down to the first bounce
            return pos, qmul(tumble, base_q)
        keys = []
        for f in range(F_D0, F_KICK + 1):
            pos, q = drib(f / FPS)
            keys.append(world_key(f / FPS, pos, q, rest))
        # the last bounce: from the floor up over his head and down onto it, turning the right way up on the way
        F = drib(T_KICK)[0]
        S = MEAS['land_loc']
        D = T_LAND - T_KICK
        APEX = max(F[2], S[2]) + 0.55 - F[2]
        dz = S[2] - F[2]
        tau_a = D / (1 + math.sqrt((APEX - dz) / APEX))
        kg = APEX / tau_a ** 2
        for f in range(F_KICK + 1, F_LAND + 1):
            tau = f / FPS - T_KICK
            s_ = min(1.0, tau / D)
            e = s_ * s_ * (3 - 2 * s_)
            pos = [F[0] + (S[0] - F[0]) * e, F[1] + (S[1] - F[1]) * e, F[2] + APEX - kg * (tau - tau_a) ** 2]
            q = qslerp(drib(T_KICK)[1], ql, e)
            keys.append(world_key(f / FPS, pos, q, rest))
        bump = [dict(t=T_OFF0, off=[0, 0, 0]), dict(t=T_OFF0 + 0.35, off=[0, 0, 0.30]), dict(t=T_OFF0 + 0.8, off=[0, 0, 0.28]), dict(t=T_OFF1, off=[0, 0, 0])]
        helmet_free = dict(
            part=helmet, keys=keys, bump=bump, follow=[hold_follow, head_follow],
            mix=[[0, 0, 0, 1, 0], [T_D0 - 0.01, 0, 0, 1, 0], [T_D0 + 0.01, 0, 1, 0, 0], [T_LAND - 0.12, 0, 1, 0, 0], [T_LAND + 0.12, 0, 0, 0, 1],
                 [T_OFF0, 0, 0, 0, 1], [T_OFF0 + 0.3, 0, 0, 0, 1], [T_OFF1, 0, 0, 1, 0], [T, 0, 0, 1, 0]])

free = [helmet_free]
if MODE == 'final':
    f_hide, f_show = MEAS['hair_hide_f'], MEAS['hair_show_f']        # out the frame the helmet meets the hair, back the frame it leaves it
    free.append(dict(part=HAIR, keys=[dict(t=round(f / FPS, 5), scale=(0.0001 if f_hide <= f < f_show else 1.0)) for f in range(int(T * FPS) + 1)], mix=[[0, 1, 0]]))

plan = dict(
    duration=T, fps=FPS, meta=meta,
    description=("Relaxed pose, hand on the hip, a foot tapping; the helmet hops onto his fingertips and spins there, he tosses it up and it lands on his head (hair hides); a pause, he takes it off. 15 s loop."
                 if REBEL else "Relaxed pose, hand on the hip; he dribbles the helmet like a basketball, the last bounce sends it up and it comes down on his head (hair hides); a pause, he takes it off. 15 s loop."),
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    pivots_local={'hand_r': [0, -0.04, -0.005], 'hand_l': [0, -0.04, -0.005]},
    keys={
        'arm_' + side: {'rotation_x': dense(helm_arm(0), T), 'rotation_y': dense(helm_arm(1), T), 'rotation_z': dense(helm_arm(2), T)},
        'hand_' + side: {'rotation_x': dense(helm_hand(0), T, 2), 'rotation_y': dense(helm_hand(1), T, 2), 'rotation_z': dense(helm_hand(2), T, 2)},
        'arm_' + other: ({'rotation_x': [[0, HIP[0]]], 'rotation_y': dense(hip_arm_y, T, 4), 'rotation_z': [[0, HIP[2]]]} if REBEL else
                         {'rotation_x': dense(other_arm(0, lambda t: HIP[0]), T), 'rotation_y': dense(other_arm(1, hip_arm_y), T), 'rotation_z': dense(other_arm(2, lambda t: HIP[2]), T)}),
        'hand_' + other: {'rotation_x': [[0, HIP[3]]], 'rotation_y': [[0, HIP[4]]], 'rotation_z': [[0, HIP[5]]]},
        'leg_' + side: {'rotation_x': dense(tap, T)},
        'head': {'rotation_x': dense(head_x, T, 2), 'rotation_z': dense(head_z, T, 2)},
        'torso': {'rotation_z': dense(torso_z, T, 2), 'rotation_x': dense(torso_x, T, 2)},
    },
    free=free,
)
print(json.dumps(plan))
