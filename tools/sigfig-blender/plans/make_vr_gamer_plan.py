"""Writes vr-gamer-rage-quit.json (20 s). Times are seconds; the file is the readable source of the choreography.
    python3 make_vr_gamer_plan.py > vr-gamer-rage-quit.json

This is the v5 motion, unchanged, plus: both hands roll 90 degrees about their pin while gripping (hand_roll), and v5's third sob
burst (13.8-14.5) is a deep breath in and a sigh instead (the two sob bursts at 9.8-11.6 and 12.0-13.6 are v5's)."""
import json, os

HOLD = (0.0, -0.27, 0.56)
K = lambda *pairs: [list(p) for p in pairs]
POCKET = (-0.08, 0.13, 0.43)                                 # the right back pocket (metres from his centre; z is height)

head_z = K((0, 0), (0.6, 38), (1.3, -35), (1.8, 10), (2.2, 0), (3.4, 0), (4.0, -6), (4.6, 4), (5.3, -4), (6.0, 6), (6.5, 0),
           (7.0, 0), (8.2, 0), (9.0, -8), (11.5, 6), (13.5, -6), (14.8, 0), (16.2, 0), (16.9, -14), (17.8, -12), (18.6, 0), (19.4, 0))
head_x = K((0, 0), (0.5, -10), (1.0, 12), (1.6, -8), (2.2, 2), (2.8, 10), (3.4, 6), (3.9, 12), (4.3, 10), (4.7, 6), (5.2, 12),
           (5.6, 6), (6.0, 14), (6.4, 10), (6.8, -8), (7.15, -30), (7.7, -22), (8.3, 6), (9.0, 40), (9.6, 42), (13.6, 42), (14.1, 34), (14.6, 44), (15.0, 14),
           (15.6, 2), (16.2, 0), (17.6, 0), (19.0, 0))
head_y = K((0, 0), (5.5, 0), (9.4, 0), (10.2, 8), (12.0, -6), (13.5, 6), (14.4, 0), (16.0, 0), (18.0, 0))
torso_x = K((0, 2), (0.8, 5), (1.6, 3), (2.2, 4), (2.8, 12), (3.3, 16), (3.9, 12), (4.35, 18), (4.8, 8), (5.25, 20), (5.7, 8),
            (6.0, 22), (6.4, 10), (6.7, -8), (6.95, 22), (7.4, 2), (8.0, 6), (8.7, 30), (9.3, 36), (13.6, 36), (14.1, 26), (14.6, 38), (15.1, 20), (15.7, 4),
            (16.3, 4), (17.3, 10), (18.2, 8), (19.0, 5), (19.6, 3))
torso_z = K((0, 0), (1.0, -6), (1.7, 6), (2.2, 0), (3.4, 0), (4.35, -8), (5.25, -10), (6.0, -12), (6.5, 0), (7.5, 0), (16.2, 0),
            (16.8, -26), (17.8, -24), (18.6, -4), (19.3, 0))
torso_y = K((0, 0), (0.7, -4), (1.4, 5), (2.2, 0), (9.6, 0), (10.4, 5), (12.0, -5), (13.6, 5), (14.4, 0), (16.0, 0))
hips_z = K((0, 0), (1.5, 0), (3.0, 0), (4.5, 0), (6.0, 0), (7.5, 0), (8.0, 0), (8.35, -9), (8.7, -19), (8.9, -18), (11.0, -18),
           (13.0, -18), (15.0, -18), (15.7, 0), (16.8, 0), (18.0, 0), (19.2, 0))
leg_x = K((0, 0), (1.5, 0), (3.0, 0), (4.5, 0), (6.0, 0), (7.5, 0), (8.0, 0), (8.7, -90), (11.0, -90), (13.0, -90), (15.0, -90),
          (15.7, 0), (16.8, 0), (18.0, 0), (19.2, 0))
arm_x = K((0, 0), (3.0, 0), (6.0, 0), (6.6, 0), (6.87, -60), (7.22, -165), (7.57, -150), (8.07, -30), (8.47, 0), (9.5, 0),
          (12.0, 0), (15.0, 0), (17.5, 0))

shakes = [
    dict(part='head', channel='rotation_z', t0=2.3, t1=3.35, amp=32, hz=3.2, fade=0.12),
    dict(part='torso', channel='rotation_z', t0=2.3, t1=3.35, amp=7, hz=3.2, fade=0.12),
    dict(part='head', channel='rotation_z', t0=3.9, t1=6.4, amp=5, hz=2.5, fade=0.3),
]
for a, b in ((9.8, 11.6), (12.0, 13.6)):                     # sob bursts
    shakes.append(dict(part='head', channel='rotation_x', t0=a, t1=b, amp=3, hz=4.8, fade=0.2))
    shakes.append(dict(part='torso', channel='rotation_x', t0=a, t1=b, amp=3, hz=4.8, fade=0.2))

GL, GR = [-0.155, -0.10, -0.04], [0.155, -0.10, -0.04]      # handles: the figure's left hand takes local -x (the prop is turned half way round)
targets = {
    'grip_l': dict(frame='prop', mode='local', p=GL),
    'grip_r': dict(frame='prop', mode='local', p=GR),
    'wind_r': dict(frame='prop', mode='local', p=[0.10, 0.0, 0.26]),     # fist hovering above the printed face
    'hit_r': dict(frame='prop', mode='local', p=[0.10, 0.0, 0.02]),      # ... and on it
    'face_r': dict(frame='head_3', mode='rest_world', p=[-0.06, -0.19, 0.86]),
    'face_l': dict(frame='head_3', mode='rest_world', p=[0.06, -0.19, 0.86]),
    'pocket': dict(frame='hips', mode='rest_world', p=list(POCKET)),            # the back pocket of his trousers: the hand goes there, and the controller comes out there
}
aim = {
    'arm_l': [
        dict(target='grip_l', w=K((0, 1), (6.87, 1), (7.02, 0), (18.5, 0), (19.0, 1))),
        dict(target='face_l', w=K((8.8, 0), (9.3, 1), (14.6, 1), (15.1, 0))),
    ],
    'arm_r': [
        dict(target='grip_r', w=K((0, 1), (3.5, 1), (3.9, 0), (6.2, 0), (6.55, 1), (6.87, 1), (7.02, 0), (16.2, 0), (16.8, 1))),       # from the reach into the pocket on, the clip holds the (still hidden) controller's wing there
        dict(target='wind_r', w=K((3.5, 0), (3.9, 1), (6.1, 1), (6.4, 0))),
        dict(target='hit_r', w=K((4.15, 0), (4.35, 1), (4.5, 0), (5.05, 0), (5.25, 1), (5.4, 0), (5.8, 0), (6.0, 1), (6.15, 0))),
        dict(target='face_r', w=K((8.8, 0), (9.3, 1), (14.6, 1), (15.1, 0))),
    ],
}

def pk(t, pos, rot=(0, 0, 0), s=1.0):
    return dict(t=t, pos=list(pos), rot=list(rot), scale=s)

def swing(f0=428, f1=450, x_side=-0.30, y_side=0.05, z=0.50, psi0=-180.0, psi1=0.0, yaw_from=2.5, yaw_to=4.0):
    """The controller leaves the back pocket by its right wing and goes round the right hip to the front, a key on every frame f0 .. f1.
    The right hand holds the wing, so it is the wing that travels: out of the pocket behind him, to his right side (x_side, y_side, metres from his centre), on to the
    front, and in to where the hold begins (-0.155, -0.17, 0.52). The controller hangs off the wing, and is turned about it (psi0 -> psi1 degrees, a quarter of
    the way along the path to three quarters: yaw_from / yaw_to are positions along the five waypoints) so that its body always points away from his body: out and
    back from the pocket, out to the side, then round to the front. The waypoints and yaw schedule were found by scanning his whole body (hips, torso, legs, left arm,
    head) at every frame of the swing for triangles of the controller cutting it, and the wing's distance from the right shoulder for a reach the arm has."""
    import math
    W = [POCKET, (-0.22, 0.17, z), (x_side, y_side, z), (-0.27, -0.15, z + 0.03), (-0.155, -0.17, 0.52)]
    off = (-0.155, 0.10, -0.04)                          # the right wing's offset from the controller's origin at yaw 0 (world axes)
    sm = lambda x: max(0.0, min(1.0, x)) ** 2 * (3 - 2 * max(0.0, min(1.0, x)))
    def cr(p0, p1, p2, p3, u):
        return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3)
    out, n = [], f1 - f0
    for k in range(n + 1):
        sp = sm(k / n) * (len(W) - 1)
        i = min(int(sp), len(W) - 2)
        u = sp - i
        P = lambda j: W[max(0, min(len(W) - 1, j))]
        w = [cr(P(i - 1)[c], P(i)[c], P(i + 1)[c], P(i + 2)[c], u) for c in range(3)]
        psi = psi0 + (psi1 - psi0) * sm((sp - yaw_from) / (yaw_to - yaw_from))
        cs, sn = math.cos(math.radians(psi)), math.sin(math.radians(psi))
        c = (w[0] - (cs * off[0] - sn * off[1]), w[1] - (sn * off[0] + cs * off[1]), w[2] - off[2])
        out.append(pk(round((f0 + k) / 24, 5), tuple(round(v, 4) for v in c), (0, 0, round(psi, 3)), 1.0))
    return out


def POCKET_KEY(sc):
    """The controller growing out of the pocket (scale sc) about its right wing, which stays in the hand: (position, wing)."""
    import math
    c, s_ = math.cos(math.radians(-180.0)), math.sin(math.radians(-180.0))
    off = (-0.155, 0.10, -0.04)
    return (tuple(round(POCKET[i] - sc * ((c * off[0] - s_ * off[1]), (s_ * off[0] + c * off[1]), off[2])[i], 4) for i in range(3)), POCKET)


SWING = swing(x_side=float(os.environ.get('VR_X', -0.30)), y_side=float(os.environ.get('VR_Y', 0.05)), z=float(os.environ.get('VR_Z', 0.50)),
                yaw_from=float(os.environ.get('VR_YF', 2.5)), yaw_to=float(os.environ.get('VR_YT', 4.0)))      # env overrides for the clearance scan
y0 = -0.27
prop = [
    pk(0.0, (0, y0, 0.56)),
    pk(0.5, (0.02, y0 - 0.005, 0.58), (22, 12, 6)),
    pk(1.0, (-0.02, y0 + 0.005, 0.55), (-18, -14, 12)),
    pk(1.5, (0.01, y0 - 0.01, 0.60), (26, 10, -14)),
    pk(2.0, (0, y0, 0.57), (-14, -8, 5)),
    pk(2.3, (0, y0 - 0.005, 0.58)),
]
for i in range(8):                                      # fury shake, 2.362 .. 3.237
    sgn = 1 if i % 2 == 0 else -1
    prop.append(pk(2.362 + 0.125 * i, (0.03 * sgn, y0 - 0.005 + 0.0, 0.58 + 0.01 * sgn), (8 * sgn, 16 * sgn, 8 * sgn)))
prop += [
    pk(3.362, (0.035, y0 + 0.03, 0.59), (10, 24, 6)),
    pk(3.75, (-0.03, -0.26, 0.60), (-12, 0, 6)),
    pk(4.05, (-0.05, -0.25, 0.64), (-28, 0, 6)),
    pk(4.35, (-0.05, -0.245, 0.605), (-24, 0, 6)),         # strike 1
    pk(4.55, (-0.05, -0.25, 0.64), (-28, 0, 7)),
    pk(5.25, (-0.05, -0.24, 0.585), (-20, 0, 8)),          # strike 2
    pk(5.5, (-0.05, -0.25, 0.64), (-28, 0, 7)),
    pk(6.0, (-0.05, -0.235, 0.57), (-17, 0, 10)),          # strike 3
    pk(6.3, (-0.02, -0.26, 0.58), (-10, 0, 4)),
    pk(6.57, (0, -0.27, 0.46), (-8, 0, 0)),               # throw: wind-up low
    pk(6.77, (0, -0.26, 0.42), (-15, 0, 0)),
    pk(6.95, (0, -0.25, 0.95), (-30, 0, 0)),              # release
    pk(7.12, (0, -0.3, 1.45), (-200, 0, 0)),
    pk(7.52, (0, -0.5, 3.0), (-520, 0, 30)),
    pk(7.67, (0, -0.6, 3.6), (-640, 0, 30), 0.0),
    pk(7.9, (-0.09, 0.12, 0.44), (0, 0, 0), 0.0),         # hidden in the back pocket
] + [pk(t_, POCKET_KEY(sc)[0], SWING[0]['rot'], sc) for t_, sc in ((16.0, 0.0), (17.55, 0.0), (17.62, 0.25), (17.69, 0.55), (17.76, 0.85))] + [
]
prop += SWING[1:] if False else SWING                    # pulled out of the pocket and swung round the right hip to the front
prop += [
    pk(19.0, (0.0, -0.27, 0.56), (0, 0, 0)),
    pk(19.4, (0, -0.27, 0.56), (0, 0, 0)),
]

plan = dict(
    duration=20.0, fps=24,
    description="He concentrates on the game, looks around and twists the controller, shakes it and his head in fury, smashes the printed face three times with the free hand, throws the controller up out of frame, sits slumped and cries with his hands at his face for about six seconds, stands, reaches into the back pocket and pulls the controller out; loop. 20 s.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    keys={'head': {'rotation_z': head_z, 'rotation_x': head_x, 'rotation_y': head_y},
          'torso': {'rotation_x': torso_x, 'rotation_z': torso_z, 'rotation_y': torso_y},
          'hips': {'location_z': hips_z}, 'leg_l': {'rotation_x': leg_x}, 'leg_r': {'rotation_x': leg_x},
          'arm_l': {'rotation_x': arm_x}, 'arm_r': {'rotation_x': arm_x}},
    shakes=shakes, targets=targets, aim=aim,
    hand_roll={'arm_r': dict(target='grip_r', deg=90), 'arm_l': dict(target='grip_l', deg=-90)},
    prop=dict(part='acc_53118pb01', base='print_up_handles_in', keys=prop),
)
print(json.dumps(plan, indent=1))
