"""Writes vr-gamer-rage-quit.json (20 s). Times are seconds; the file is the readable source of the choreography.
    python3 make_vr_gamer_plan.py > vr-gamer-rage-quit.json

Story: concentrates and looks around, twists the controller (0-2.3), fury shake (2.3-3.4), three-hit button smash with the
free hand (3.9-6.2), throws it up and out of frame (6.6-7.7), sits (7.9-8.7), cries: sob burst, sob burst, deep breath, sigh
(8.9-15.7), stands (15.9-16.6), reaches for the back pocket (17.0-17.6), pulls the controller out by one handle and swings it
into both hands (17.6-19.4), settles and loops."""
import json, math

K = lambda *pairs: [list(p) for p in pairs]
TILT = -10          # the controller is held tipped a little toward his face so the printed side reads

head_z = K((0, 0), (0.6, 38), (1.3, -35), (1.8, 10), (2.2, 0), (3.4, 0), (4.0, -6), (4.6, 4), (5.3, -4), (6.0, 6), (6.5, 0),
           (7.0, 0), (8.2, 0), (9.0, -8), (10.3, 6), (12.4, -6), (13.6, 0), (14.6, 0), (15.7, 0), (16.2, 0), (17.1, -14), (18.0, -12),
           (18.7, 0), (19.4, 0))
head_x = K((0, 0), (0.5, -10), (1.0, 12), (1.6, -8), (2.2, 2), (2.8, 10), (3.4, 6), (3.9, 12), (4.3, 10), (4.7, 6), (5.2, 12),
           (5.6, 6), (6.0, 14), (6.4, 10), (6.8, -8), (7.15, -30), (7.7, -22), (8.3, 6), (8.9, 40), (9.4, 42), (13.3, 42),
           (14.2, 30),      # deep breath in: the head lifts
           (15.2, 44),      # the sigh: it drops further than before
           (15.7, 42), (16.2, 14), (16.7, 2), (17.6, 0), (19.0, 0))
head_y = K((0, 0), (5.5, 0), (9.4, 0), (10.3, 8), (12.2, -6), (13.4, 4), (14.2, 0), (16.0, 0), (18.0, 0))
torso_x = K((0, 2), (0.8, 5), (1.6, 3), (2.2, 4), (2.8, 12), (3.3, 16), (3.9, 12), (4.35, 18), (4.8, 8), (5.25, 20), (5.7, 8),
            (6.0, 22), (6.4, 10), (6.7, -8), (6.95, 22), (7.4, 2), (8.0, 6), (8.6, 30), (9.2, 36), (13.3, 36),
            (14.2, 20),     # breath in: the chest lifts
            (15.2, 40),     # the sigh: it all falls
            (15.7, 36), (16.3, 14), (16.9, 4), (17.4, 10), (18.2, 8), (19.0, 5), (19.6, 3))
torso_z = K((0, 0), (1.0, -6), (1.7, 6), (2.2, 0), (3.4, 0), (4.35, -8), (5.25, -10), (6.0, -12), (6.5, 0), (7.5, 0), (16.2, 0),
            (17.0, -26), (18.0, -24), (18.7, -4), (19.4, 0))
torso_y = K((0, 0), (0.7, -4), (1.4, 5), (2.2, 0), (9.6, 0), (10.4, 5), (12.2, -5), (13.4, 4), (14.2, 0), (16.0, 0))
hips_z = K((0, 0), (1.5, 0), (3.0, 0), (4.5, 0), (6.0, 0), (7.5, 0), (7.9, 0), (8.25, -9), (8.6, -19), (8.8, -18), (11.5, -18),
           (14.0, -18), (15.9, -18), (16.6, 0), (17.6, 0), (18.8, 0))
leg_x = K((0, 0), (1.5, 0), (3.0, 0), (4.5, 0), (6.0, 0), (7.5, 0), (7.9, 0), (8.6, -90), (11.5, -90), (14.0, -90), (15.9, -90),
          (16.6, 0), (17.6, 0), (18.8, 0))
arm_x = K((0, 0), (3.0, 0), (6.0, 0), (6.6, 0), (6.87, -60), (7.22, -165), (7.57, -150), (8.07, -30), (8.47, 0), (9.5, 0),
          (12.0, 0), (15.0, 0), (17.5, 0))

shakes = [
    dict(part='head', channel='rotation_z', t0=2.3, t1=3.35, amp=32, hz=3.2, fade=0.12),
    dict(part='torso', channel='rotation_z', t0=2.3, t1=3.35, amp=7, hz=3.2, fade=0.12),
    dict(part='head', channel='rotation_z', t0=3.9, t1=6.4, amp=5, hz=2.5, fade=0.3),
]
for a, b in ((9.4, 11.1), (11.8, 13.5)):                  # two sob bursts
    shakes.append(dict(part='head', channel='rotation_x', t0=a, t1=b, amp=4, hz=4.8, fade=0.2))
    shakes.append(dict(part='torso', channel='rotation_x', t0=a, t1=b, amp=4, hz=4.8, fade=0.2))
    shakes.append(dict(part='torso', channel='rotation_y', t0=a, t1=b, amp=2, hz=2.4, fade=0.2))

GL, GR = [-0.153, -0.06, -0.04], [0.153, -0.06, -0.04]     # the middle of each handle (the figure's left hand takes local -x: the prop is turned half way round)
targets = {
    'grip_l': dict(frame='prop', mode='local', p=GL),
    'grip_r': dict(frame='prop', mode='local', p=GR),
    'wind_r': dict(frame='prop', mode='local', p=[0.10, 0.0, 0.26]),     # fist hovering above the printed face
    'hit_r': dict(frame='prop', mode='local', p=[0.10, 0.0, 0.02]),      # ... and on it
    'face_r': dict(frame='head_3', mode='rest_world', p=[-0.07, -0.13, 0.70]),
    'face_l': dict(frame='head_3', mode='rest_world', p=[0.07, -0.13, 0.70]),
    'pocket': dict(frame='hips', mode='rest_world', p=[-0.08, 0.13, 0.43]),
}
aim = {
    'arm_l': [
        dict(target='grip_l', w=K((0, 1), (6.87, 1), (7.02, 0), (18.5, 0), (19.2, 1))),
        dict(target='face_l', w=K((8.8, 0), (9.3, 1), (15.5, 1), (16.0, 0))),
    ],
    'arm_r': [
        dict(target='grip_r', w=K((0, 1), (3.5, 1), (3.9, 0), (6.2, 0), (6.55, 1), (6.87, 1), (7.02, 0), (17.4, 0), (17.8, 1))),
        dict(target='wind_r', w=K((3.5, 0), (3.9, 1), (6.1, 1), (6.4, 0))),
        dict(target='hit_r', w=K((4.15, 0), (4.35, 1), (4.5, 0), (5.05, 0), (5.25, 1), (5.4, 0), (5.8, 0), (6.0, 1), (6.15, 0))),
        dict(target='face_r', w=K((8.8, 0), (9.3, 1), (15.5, 1), (16.0, 0))),
        dict(target='pocket', w=K((16.4, 0), (17.0, 1), (17.5, 1), (17.8, 0))),
    ],
}


def pk(t, pos, rot=(0, 0, 0), s=1.0):
    return dict(t=t, pos=list(pos), rot=list(rot), scale=s)


y0 = -0.27
prop = [
    pk(0.0, (0, y0, 0.56), (TILT, 0, 0)),
    pk(0.5, (0.02, y0 - 0.005, 0.58), (22 + TILT, 12, 6)),
    pk(1.0, (-0.02, y0 + 0.005, 0.55), (-18 + TILT, -14, 12)),
    pk(1.5, (0.01, y0 - 0.01, 0.60), (26 + TILT, 10, -14)),
    pk(2.0, (0, y0, 0.57), (-14 + TILT, -8, 5)),
    pk(2.3, (0, y0 - 0.005, 0.58), (TILT, 0, 0)),
]
for i in range(8):                                      # fury shake, 2.362 .. 3.237
    sgn = 1 if i % 2 == 0 else -1
    prop.append(pk(2.362 + 0.125 * i, (0.03 * sgn, y0 - 0.005, 0.58 + 0.01 * sgn), (8 * sgn + TILT, 16 * sgn, 8 * sgn)))
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
    pk(17.4, (-0.09, 0.12, 0.44), (0, 0, 0), 0.0),
]


def _M(rot):                                          # Euler XYZ (degrees) applied after the print-up / handles-in base turn
    rx, ry, rz = (math.radians(a) for a in rot)
    cx, sx, cy, sy, cz, sz = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry), math.cos(rz), math.sin(rz)
    Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]
    Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]
    Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]]
    mm = lambda A, B: [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
    base = [[-1, 0, 0], [0, -1, 0], [0, 0, 1]]
    return mm(mm(mm(Rz, Ry), Rx), base)


def held(t, G, rot, s=1.0):
    """Prop key with the RIGHT handle's grip point at G (figure-relative metres), whatever the rotation: the controller
    swings about the hand that holds it."""
    M = _M(rot)
    off = [sum(M[i][k] * GR[k] for k in range(3)) for i in range(3)]
    return pk(t, [G[i] - off[i] for i in range(3)], rot, s)


prop += [
    held(17.6, (-0.08, 0.13, 0.43), (-90, 0, 0), 0.0),
    held(17.8, (-0.08, 0.13, 0.43), (-90, 0, 0), 1.0),     # gripped by its right handle, hanging, print facing back
    held(18.25, (-0.11, 0.04, 0.46), (-72, 0, 14)),
    held(18.65, (-0.14, -0.07, 0.50), (-38, 0, 8)),
    held(19.05, (-0.153, -0.13, 0.52), (-14, 0, 2)),
    pk(19.4, (0, y0, 0.56), (TILT, 0, 0)),
]

plan = dict(
    duration=20.0, fps=24,
    description="He concentrates on the game, looks around and twists the controller, shakes it and his head in fury, smashes the printed face three times with the free hand, throws the controller up out of frame, sits slumped and cries (two sob bursts, a deep breath, a sigh) with his hands at his face, stands, reaches into the back pocket and pulls the controller out by one handle; loop. 20 s.",
    bend={'torso': {'zone': 0.32, 'segments': 4}, 'head': {'zone': 0.12, 'segments': 3}},
    keys={'head': {'rotation_z': head_z, 'rotation_x': head_x, 'rotation_y': head_y},
          'torso': {'rotation_x': torso_x, 'rotation_z': torso_z, 'rotation_y': torso_y},
          'hips': {'location_z': hips_z}, 'leg_l': {'rotation_x': leg_x}, 'leg_r': {'rotation_x': leg_x},
          'arm_l': {'rotation_x': arm_x}, 'arm_r': {'rotation_x': arm_x}},
    shakes=shakes, targets=targets, aim=aim,
    hand_grips={'arm_l': dict(target='grip_l', handle_axis=[0, 1, 0], open=[0, 0, -1]), 'arm_r': dict(target='grip_r', handle_axis=[0, 1, 0], open=[0, 0, -1])},
    prop=dict(part='acc_53118pb01', base='print_up_handles_in', keys=prop),
)
print(json.dumps(plan, indent=1))
